import { useCallback, useEffect, useMemo, useState, type FormEvent, type WheelEvent as ReactWheelEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowDown,
  ArrowRight,
  BedDouble,
  Building2,
  Check,
  ChevronDown,
  CircleCheck,
  DoorOpen,
  House,
  KeyRound,
  LockKeyhole,
  LogIn,
  MapPin,
  Menu,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type ApartmentStatus = "confirmar" | "disponivel" | "negociacao" | "vendido";
type Apartment = {
  id: number;
  residential_number: number;
  apartment_number: number;
  floor: string;
  status: ApartmentStatus;
  price: number;
  area: number | null;
  bedrooms: number;
  description: string;
  updated_at: string;
};

const whatsappNumber = "5583996548074";
const developerWhatsappNumber = "5583996013656";
const statuses: Record<ApartmentStatus, { label: string; className: string }> = {
  confirmar: { label: "A confirmar", className: "pending" },
  disponivel: { label: "Disponível", className: "available" },
  negociacao: { label: "Em negociação", className: "negotiating" },
  vendido: { label: "Vendido", className: "sold" },
};

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function romanNumeral(value: number) {
  const numerals: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"],
    [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"],
    [5, "V"], [4, "IV"], [1, "I"],
  ];
  let remainder = value;
  let result = "";
  for (const [amount, numeral] of numerals) {
    while (remainder >= amount) {
      result += numeral;
      remainder -= amount;
    }
  }
  return result;
}

function floorLabel(index: number) {
  return index === 0 ? "Térreo" : `${index}º andar`;
}

function unitDisplayNumber(apartments: Apartment[], apartment: Apartment) {
  const floorPosition = apartments
    .filter((item) => item.residential_number === apartment.residential_number && item.floor === apartment.floor)
    .sort((first, second) => first.apartment_number - second.apartment_number)
    .findIndex((item) => item.apartment_number === apartment.apartment_number) + 1;
  const floorIndex = apartment.floor === "Térreo" ? 0 : Number.parseInt(apartment.floor, 10);
  return (floorIndex + 1) * 100 + floorPosition;
}

function changeSelectWithWheel(event: ReactWheelEvent<HTMLSelectElement>, onChange: (value: string) => void) {
  const select = event.currentTarget;
  if (document.activeElement !== select || event.deltaY === 0) return;

  const options = Array.from(select.options).filter((option) => !option.disabled);
  const selectedIndex = options.findIndex((option) => option.value === select.value);
  const nextIndex = selectedIndex + (event.deltaY > 0 ? 1 : -1);
  if (nextIndex < 0 || nextIndex >= options.length) return;

  event.preventDefault();
  onChange(options[nextIndex].value);
}

function App() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedResidential, setSelectedResidential] = useState("todos");
  const [selectedStatus, setSelectedStatus] = useState("disponivel");
  const [search, setSearch] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [editResidential, setEditResidential] = useState("13");
  const [editApartment, setEditApartment] = useState("1");
  const [creatingResidential, setCreatingResidential] = useState(false);
  const [floorCounts, setFloorCounts] = useState([{ count: "3" }, { count: "3" }]);
  const [editStatus, setEditStatus] = useState<ApartmentStatus>("disponivel");
  const [editPrice, setEditPrice] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editBedrooms, setEditBedrooms] = useState("2");
  const [editDescription, setEditDescription] = useState("");

  const fetchApartments = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      setLoadError("Configure o Supabase para carregar a disponibilidade atualizada dos imóveis.");
      return;
    }

    setLoadError("");
    const { data, error } = await supabase
      .from("apartments")
      .select("id,residential_number,apartment_number,floor,status,price,area,bedrooms,description,updated_at")
      .order("residential_number")
      .order("apartment_number");
    if (error) {
      setLoadError(`Não foi possível carregar os apartamentos: ${error.message}`);
    } else {
      setApartments((data ?? []) as Apartment[]);
    }
    setLoading(false);
  }, []);

  const residentialNumbers = useMemo(
    () => [...new Set(apartments.map((apartment) => apartment.residential_number))].sort((a, b) => a - b),
    [apartments],
  );
  const recentResidentials = residentialNumbers.slice(-3).map((number) => ({ number, roman: romanNumeral(number) }));

  useEffect(() => {
    void fetchApartments();
    const client = supabase;
    if (!client) return;

    void client.auth.getSession().then(({ data, error }) => {
      if (error) {
        setToast(`Não foi possível verificar o login: ${error.message}`);
        return;
      }
      setSession(data.session);
    });
    const { data: authListener } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setIsAdmin(false);
        setAdminOpen(false);
        setLoginOpen(false);
        return;
      }

      if (event === "SIGNED_IN") {
        setAdminOpen(false);
        setLoginOpen(false);
      }

      void client
        .from("profiles")
        .select("role")
        .eq("user_id", nextSession.user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            setToast(`Não foi possível verificar o perfil: ${error.message}`);
            return;
          }
          const hasAdminAccess = data?.role === "admin";
          setIsAdmin(hasAdminAccess);
          if (event === "SIGNED_IN" && hasAdminAccess) setAdminOpen(true);
          if (event === "SIGNED_IN" && !hasAdminAccess) setToast("Seu usuário não tem permissão de administrador.");
        });
    });
    return () => authListener.subscription.unsubscribe();
  }, [fetchApartments]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredApartments = useMemo(() => apartments.filter((apartment) => {
    const matchesResidential = selectedResidential === "todos" || apartment.residential_number === Number(selectedResidential);
    const matchesStatus = selectedStatus === "todos" || apartment.status === selectedStatus;
    const term = search.trim().toLocaleLowerCase("pt-BR");
    const matchesSearch = !term
      || `residencial plenitude ${romanNumeral(apartment.residential_number)}`.toLocaleLowerCase("pt-BR").includes(term)
      || `apartamento ${unitDisplayNumber(apartments, apartment)}`.includes(term)
      || String(unitDisplayNumber(apartments, apartment)).includes(term)
      || String(apartment.apartment_number).includes(term);
    return matchesResidential && matchesStatus && matchesSearch;
  }), [apartments, search, selectedResidential, selectedStatus]);

  const visibleApartments = filteredApartments;
  const availableCount = apartments.filter((apartment) => apartment.status === "disponivel").length;
  const negotiationCount = apartments.filter((apartment) => apartment.status === "negociacao").length;
  const residentialCount = new Set(filteredApartments.map((apartment) => apartment.residential_number)).size;
  const totalResidentialCount = Math.max(13, residentialNumbers.length);
  const totalApartmentCount = Math.max(78, apartments.length);

  function prepareEdit(residential: string, apartment: string) {
    setEditResidential(residential);
    setEditApartment(apartment);
    const record = apartments.find((item) => item.residential_number === Number(residential) && item.apartment_number === Number(apartment));
    if (!record) {
      setEditStatus("confirmar");
      setEditPrice("");
      setEditArea("");
      setEditBedrooms("2");
      setEditDescription("");
      return;
    }
    setEditStatus(record.status);
    setEditPrice(record.price ? String(record.price) : "");
    setEditArea(record.area ? String(record.area) : "");
    setEditBedrooms(String(record.bedrooms));
    setEditDescription(record.description);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    setBusy(false);
    if (error) {
      setToast(`Não foi possível entrar: ${error.message}`);
      return;
    }
    setLoginPassword("");
  }

  async function handleLogout() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setToast(`Não foi possível sair: ${error.message}`);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !isAdmin) return;
    const record = apartments.find((item) => item.residential_number === Number(editResidential) && item.apartment_number === Number(editApartment));
    if (!record) {
      setToast("Apartamento não encontrado. Confira a configuração inicial do Supabase.");
      return;
    }
    const price = Number(editPrice.replace(",", "."));
    const area = editArea ? Number(editArea.replace(",", ".")) : null;
    if (!Number.isFinite(price) || price < 0 || (area !== null && (!Number.isFinite(area) || area <= 0))) {
      setToast("Confira o valor e a área informados.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("apartments")
      .update({
        status: editStatus,
        price,
        area,
        bedrooms: Number(editBedrooms),
        description: editDescription.trim(),
      })
      .eq("id", record.id);
    setBusy(false);
    if (error) {
      setToast(`Não foi possível salvar: ${error.message}`);
      return;
    }
    setToast("Informações do apartamento atualizadas.");
    setAdminOpen(false);
    await fetchApartments();
  }

  async function handleCreateResidential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !isAdmin) return;

    const counts = floorCounts.map(({ count }) => Number(count));
    if (counts.some((count) => !Number.isInteger(count) || count < 1)) {
      setToast("Informe ao menos um apartamento em cada andar adicionado.");
      return;
    }

    const apartmentCount = counts.reduce((total, count) => total + count, 0);
    const residentialNumber = (residentialNumbers[residentialNumbers.length - 1] ?? 0) + 1;
    if (residentialNumber > 32767 || apartmentCount > 32767) {
      setToast("A quantidade informada ultrapassa o limite permitido.");
      return;
    }

    const newApartments = floorCounts.flatMap(({ count }, floorIndex) =>
      Array.from({ length: Number(count) }, (_, position) => ({
        residential_number: residentialNumber,
        apartment_number: floorCounts
          .slice(0, floorIndex)
          .reduce((total, floor) => total + Number(floor.count), 0) + position + 1,
        floor: floorLabel(floorIndex),
      })),
    );

    setBusy(true);
    const { error } = await supabase.from("apartments").insert(newApartments);
    setBusy(false);
    if (error) {
      setToast(`Não foi possível criar o residencial: ${error.message}`);
      return;
    }

    setToast(`Residencial ${romanNumeral(residentialNumber)} criado com ${apartmentCount} apartamentos.`);
    setCreatingResidential(false);
    setFloorCounts([{ count: "3" }, { count: "3" }]);
    setEditResidential(String(residentialNumber));
    setEditApartment("1");
    await fetchApartments();
  }

  const selectedRecord = apartments.find(
    (item) => item.residential_number === Number(editResidential) && item.apartment_number === Number(editApartment),
  );
  const selectedResidentialApartments = apartments
    .filter((item) => item.residential_number === Number(editResidential))
    .sort((first, second) => first.apartment_number - second.apartment_number);

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Residenciais Plenitude - início">
          <span className="brand-mark"><Building2 size={21} strokeWidth={1.6} /></span>
          <span className="brand-copy"><strong>plenitude</strong><small>RESIDENCIAIS</small></span>
        </a>
        <button className="mobile-menu-toggle icon-button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Abrir menu">
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={`main-nav ${mobileMenuOpen ? "nav-open" : ""}`}>
          <a href="#imoveis" onClick={() => setMobileMenuOpen(false)}>Nossos imóveis</a>
          <a href="#sobre" onClick={() => setMobileMenuOpen(false)}>Sobre o Plenitude</a>
          <a className="nav-contact" href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Olá! Vim do site e quero saber mais sobre os apartamentos Plenitude.")}`} target="_blank" rel="noreferrer">Fale com um consultor <ArrowRight size={15} /></a>
        </nav>
        <div className="header-account">
          {session && isAdmin
            ? <>
              <button className="admin-access" onClick={() => {
                prepareEdit(editResidential, editApartment);
                setAdminOpen(true);
              }}><Pencil size={15} /> Gerenciar imóveis</button>
              <button className="login-link" onClick={() => void handleLogout()}><LogIn size={15} className="logout-icon" /> Sair</button>
            </>
            : session
              ? <button className="login-link" onClick={() => void handleLogout()}><LogIn size={15} className="logout-icon" /> Sair</button>
              : <button className="login-link" onClick={() => setLoginOpen(true)}><LockKeyhole size={15} /> Login</button>}
        </div>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-image" aria-hidden="true" />
          <div className="hero-content">
            <div className="eyebrow"><span /> UM LUGAR PARA CHAMAR DE SEU</div>
            <h1>Seu próximo capítulo<br />começa <em>aqui.</em></h1>
            <p>Conforto, tranquilidade e um cantinho só seu.<br className="desktop-break" /> Conheça os apartamentos Plenitude.</p>
            <a className="hero-cta" href="#imoveis">Encontre seu apartamento <ArrowDown size={16} /></a>
          </div>
          <div className="hero-note"><span className="note-line" /> Há um Plenitude perfeito para você.</div>
          <div className="hero-index"><strong>+10</strong><span>residenciais<br />construídos</span></div>
        </section>

        <section className="intro-section" id="sobre">
          <div className="intro-copy">
            <span className="section-kicker">FEITO PARA A VIDA ACONTECER</span>
            <h2>Mais do que um endereço.<br /><span>Um novo começo.</span></h2>
          </div>
          <p>Residenciais pensados para oferecer o que importa: praticidade, aconchego e a alegria de ter um espaço para chamar de seu.</p>
          <div className="intro-stats">
            <div><strong>{totalResidentialCount}</strong><span>residenciais</span></div>
            <i />
            <div><strong>{totalApartmentCount}</strong><span>apartamentos</span></div>
          </div>
        </section>

        <section className="catalog-section" id="imoveis">
          <div className="catalog-heading">
            <div>
              <span className="section-kicker">ESCOLHA SEU NOVO LAR</span>
              <h2>Apartamentos <span>Plenitude</span></h2>
              <p>Encontre o espaço ideal para o seu momento.</p>
            </div>
            <div className="catalog-count"><span className="live-dot" /> {availableCount} disponíveis agora</div>
          </div>

          <div className="filter-bar">
            <label className="select-wrap residential-select">
              <Building2 size={17} />
              <select aria-label="Filtrar por residencial" value={selectedResidential} onChange={(event) => setSelectedResidential(event.target.value)}>
                <option value="todos">Todos os residenciais</option>
                {residentialNumbers.map((number) => <option value={number} key={number}>Residencial Plenitude {romanNumeral(number)}</option>)}
              </select>
              <ChevronDown size={15} />
            </label>
            <label className="select-wrap">
              <SlidersHorizontal size={16} />
              <select aria-label="Filtrar por situação" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
                <option value="todos">Todas as situações</option>
                <option value="confirmar">A confirmar</option>
                <option value="disponivel">Disponíveis</option>
                <option value="negociacao">Em negociação</option>
                <option value="vendido">Vendidos</option>
              </select>
              <ChevronDown size={15} />
            </label>
            <label className="search-field">
              <Search size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar residencial ou apê..." />
            </label>
            <span className="filter-total">{filteredApartments.length} imóveis</span>
          </div>

          {!isSupabaseConfigured && (
            <div className="setup-notice"><ShieldCheck size={18} /><span><strong>Conecte seu Supabase</strong> para publicar a disponibilidade real dos apartamentos. Configure as variáveis no arquivo <code>.env.local</code>.</span></div>
          )}
          {loadError && isSupabaseConfigured && <div className="setup-notice error-notice"><ShieldCheck size={18} /><span>{loadError} Confira a configuração e as tabelas no Supabase.</span></div>}

          <div className="results-caption">
            <span>{selectedResidential === "todos" ? "TODOS OS RESIDENCIAIS" : `RESIDENCIAL PLENITUDE ${romanNumeral(Number(selectedResidential))}`}</span>
            <span>{negotiationCount > 0 && selectedStatus === "todos" ? `${negotiationCount} em negociação` : `${residentialCount} empreendimentos`}</span>
          </div>

          {loading
            ? <div className="empty-state"><div className="loading-spinner" /><p>Carregando apartamentos...</p></div>
            : visibleApartments.length === 0
              ? <div className="empty-state"><House size={28} /><h3>{apartments.length === 0 ? "A disponibilidade aparecerá aqui" : "Nenhum apartamento encontrado"}</h3><p>{apartments.length === 0 ? "Assim que o Supabase estiver conectado, os imóveis serão exibidos nesta página." : "Tente mudar os filtros para ver outros apartamentos."}</p></div>
              : <div className="apartment-grid">
                {visibleApartments.map((apartment) => (
                  <article className="apartment-card" key={apartment.id}>
                    <div className={`card-visual visual-${(apartment.residential_number + apartment.apartment_number) % 4}`}>
                      <div className="visual-sun" />
                      <div className="building-illustration">
                        <div className="building-top" />
                        <div className="building-body">
                          <span /><span /><span />
                          <span /><span /><span />
                        </div>
                        <div className="building-base" />
                      </div>
                      <span className="visual-label"><Sparkles size={12} /> PLENITUDE</span>
                      <span className={`status-pill ${statuses[apartment.status].className}`}><i />{statuses[apartment.status].label}</span>
                    </div>
                    <div className="card-content">
                      <div className="card-residential">RESIDENCIAL PLENITUDE {romanNumeral(apartment.residential_number)}</div>
                      <h3>Apartamento {unitDisplayNumber(apartments, apartment)}</h3>
                      <div className="apartment-details">
                        <span><DoorOpen size={15} /> {apartment.floor}</span>
                        {apartment.bedrooms > 0 && <span><BedDouble size={15} /> {apartment.bedrooms} quartos</span>}
                        {apartment.area && <span><MapPin size={14} /> {apartment.area} m²</span>}
                      </div>
                      {apartment.description && <p className="card-description">{apartment.description}</p>}
                      <div className="card-footer">
                        <div><small>VALOR</small><strong>{apartment.price ? currency(apartment.price) : "Consulte"}</strong></div>
                        {apartment.status === "disponivel"
                          ? <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Vim do site e tenho interesse no Apartamento ${unitDisplayNumber(apartments, apartment)} do Residencial Plenitude ${romanNumeral(apartment.residential_number)}.`)}`} target="_blank" rel="noreferrer" className="card-action" aria-label="Consultar apartamento"><ArrowRight size={18} /></a>
                          : <span className="card-status-note">{statuses[apartment.status].label}</span>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>}
          {visibleApartments.length > 0 && (
            <div className="catalog-footer"><span>Exibindo {visibleApartments.length} de {apartments.length} apartamentos</span><span><Check size={14} /> Disponibilidade atualizada pela equipe</span></div>
          )}
        </section>

        <section className="contact-banner">
          <div className="contact-icon"><KeyRound size={23} /></div>
          <div><span className="section-kicker">A GENTE TE AJUDA</span><h2>Encontrou seu lugar?</h2><p>Nosso time está pronto para conversar com você.</p></div>
          <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Olá! Vim do site e quero conhecer os apartamentos Plenitude.")}`} target="_blank" rel="noreferrer">Fale com um consultor <ArrowRight size={16} /></a>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#inicio"><span className="brand-mark"><Building2 size={20} strokeWidth={1.6} /></span><span className="brand-copy"><strong>plenitude</strong><small>RESIDENCIAIS</small></span></a>
        <div className="footer-company-info">
          <strong>PLENITUDE CONSTRUTORA E INCORPORADORA LTDA</strong>
          <span>CNPJ: 30.606.951/0001-70</span>
          <span>© {new Date().getFullYear()} Residenciais Plenitude</span>
        </div>
        <span className="footer-developer">Desenvolvido por Jobson Medeiros · <a href={`https://wa.me/${developerWhatsappNumber}`} target="_blank" rel="noreferrer">@jmmjp</a></span>
      </footer>

      {loginOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setLoginOpen(false)}>
          <section className="dialog login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-title">
            <button className="dialog-close icon-button" onClick={() => setLoginOpen(false)} aria-label="Fechar"><X size={20} /></button>
            <span className="dialog-icon"><LockKeyhole size={21} /></span>
            <span className="section-kicker">ÁREA DA EQUIPE</span>
            <h2 id="login-title">Acesso administrativo</h2>
            <p>Entre com seu usuário autorizado para atualizar os imóveis.</p>
            <form onSubmit={handleLogin}>
              <label>E-mail<input type="email" autoComplete="username" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required placeholder="voce@email.com" /></label>
              <label>Senha<input type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required placeholder="Sua senha" /></label>
              <button className="primary-button" disabled={busy}>{busy ? "Entrando..." : <><LogIn size={16} /> Entrar</>}</button>
            </form>
            <span className="secure-caption"><ShieldCheck size={14} /> Acesso protegido pelo Supabase</span>
          </section>
        </div>
      )}

      {adminOpen && isAdmin && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setAdminOpen(false)}>
          <section className="dialog admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-title">
            <button className="dialog-close icon-button" onClick={() => setAdminOpen(false)} aria-label="Fechar"><X size={20} /></button>
            <div className="admin-dialog-heading">
              <span className="dialog-icon"><Pencil size={20} /></span>
              <div><span className="section-kicker">GERENCIAR IMÓVEIS</span><h2 id="admin-title">{creatingResidential ? `Residencial ${romanNumeral((residentialNumbers[residentialNumbers.length - 1] ?? 0) + 1)}` : "Painel administrativo"}</h2></div>
              <button type="button" className="secondary-button admin-mode-toggle" onClick={() => setCreatingResidential(!creatingResidential)}>
                {creatingResidential ? <><Pencil size={15} /> Editar unidades</> : <><Plus size={15} /> Novo residencial</>}
              </button>
            </div>
            {creatingResidential ? (
              <>
                <p>Informe quantos apartamentos serão criados em cada andar. A numeração será gerada automaticamente.</p>
                <form onSubmit={handleCreateResidential}>
                  <div className="floor-count-list">
                    {floorCounts.map((floor, index) => (
                      <div className="floor-count-row" key={index}>
                        <label>{floorLabel(index)}
                          <input type="number" min="1" step="1" value={floor.count} onChange={(event) => setFloorCounts((current) => current.map((item, itemIndex) => itemIndex === index ? { count: event.target.value } : item))} required />
                        </label>
                        <span>apartamentos</span>
                        {floorCounts.length > 1 && <button type="button" className="secondary-button remove-floor-button" onClick={() => setFloorCounts((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remover ${floorLabel(index)}`}><X size={15} /></button>}
                      </div>
                    ))}
                  </div>
                  <button type="button" className="secondary-button add-floor-button" onClick={() => setFloorCounts((current) => [...current, { count: "3" }])}><Plus size={15} /> Adicionar andar</button>
                  <div className="dialog-actions">
                    <button type="button" className="secondary-button" onClick={() => setAdminOpen(false)}>Cancelar</button>
                    <button className="primary-button save-button" disabled={busy}>{busy ? "Criando..." : <><CircleCheck size={16} /> Criar residencial</>}</button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <p>Escolha o residencial e o apartamento para editar as informações.</p>
                <form onSubmit={handleSave}>
                  <div className="form-row">
                    <label>Residencial
                      <select value={editResidential} onChange={(event) => prepareEdit(event.target.value, editApartment)} onWheel={(event) => changeSelectWithWheel(event, (value) => prepareEdit(value, editApartment))}>
                        {recentResidentials.map(({ number, roman }) => <option value={number} key={roman}>Residencial Plenitude {roman}</option>)}
                      </select>
                    </label>
                    <label>Apartamento
                      <select value={editApartment} onChange={(event) => prepareEdit(editResidential, event.target.value)} onWheel={(event) => changeSelectWithWheel(event, (value) => prepareEdit(editResidential, value))}>
                        {selectedResidentialApartments.map((apartment) => <option value={apartment.apartment_number} key={apartment.id}>Apartamento {unitDisplayNumber(apartments, apartment)} · {apartment.floor}</option>)}
                      </select>
                    </label>
                  </div>
                  {selectedRecord && <div className="current-apartment"><Building2 size={17} /><span><strong>Residencial {romanNumeral(selectedRecord.residential_number)} · Apartamento {unitDisplayNumber(apartments, selectedRecord)}</strong><small>{selectedRecord.floor}</small></span><span className={`status-pill ${statuses[selectedRecord.status].className}`}><i />{statuses[selectedRecord.status].label}</span></div>}
                  <div className="form-row">
                    <label>Situação
                      <select value={editStatus} onChange={(event) => setEditStatus(event.target.value as ApartmentStatus)} onWheel={(event) => changeSelectWithWheel(event, (value) => setEditStatus(value as ApartmentStatus))}>
                        <option value="confirmar">A confirmar</option><option value="disponivel">Disponível</option><option value="negociacao">Em negociação</option><option value="vendido">Vendido</option>
                      </select>
                    </label>
                    <label>Valor do imóvel (R$)
                      <input type="number" step="1000" inputMode="decimal" value={editPrice} onChange={(event) => setEditPrice(event.target.value)} placeholder="Ex.: 189000" required />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>Área (m²)
                      <input type="number" min="0" step="1" inputMode="decimal" value={editArea} onChange={(event) => setEditArea(event.target.value)} placeholder="Ex.: 52" />
                    </label>
                    <label>Quartos
                      <input type="number" min="0" max="20" step="1" value={editBedrooms} onChange={(event) => setEditBedrooms(event.target.value)} required />
                    </label>
                  </div>
                  <label className="description-label">Informações do apartamento
                    <textarea rows={3} maxLength={500} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} placeholder="Descreva os diferenciais deste apartamento..." />
                  </label>
                  <div className="dialog-actions">
                    <button type="button" className="secondary-button" onClick={handleLogout}><LogIn size={15} className="logout-icon" /> Sair</button>
                    <button className="primary-button save-button" disabled={busy || !selectedRecord}>{busy ? "Salvando..." : <><CircleCheck size={16} /> Salvar alterações</>}</button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      )}

      {toast && <div className="toast-message" role="status"><span>{toast}</span><button onClick={() => setToast("")} aria-label="Dispensar"><X size={16} /></button></div>}
    </div>
  );
}

export default App;

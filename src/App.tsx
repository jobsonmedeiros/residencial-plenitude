import { useCallback, useEffect, useMemo, useState, type FormEvent, type WheelEvent as ReactWheelEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowDown,
  ArrowRight,
  BedDouble,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
type ApartmentAttribute = { label: string; value: string };
type Apartment = {
  id: number;
  residential_number: number;
  residential_name: string | null;
  apartment_number: number;
  floor: string;
  status: ApartmentStatus;
  price: number | null;
  area: number | null;
  bedrooms: number | null;
  description: string;
  technical_attributes: ApartmentAttribute[];
  technical_extra: string;
  financial_attributes: ApartmentAttribute[];
  financial_extra: string;
  updated_at: string;
};

const consultantWhatsappNumber = "5500000000000";
const developerWhatsappNumber = "5583996013656";
const homeCarouselImage = (fileName: string) => `${import.meta.env.BASE_URL}images/home-carousel/${fileName}`;
const homeGallerySlides = [
  { title: "Sala e jantar integradas", image: homeCarouselImage("apartamento-gomes-carvalho-02.webp") },
  { title: "Espaço de jantar", image: homeCarouselImage("apartamento-gomes-carvalho-03.webp") },
  { title: "Cozinha integrada", image: homeCarouselImage("apartamento-gomes-carvalho-04.webp") },
  { title: "Sala de estar", image: homeCarouselImage("apartamento-gomes-carvalho-05.webp") },
  { title: "Integração entre ambientes", image: homeCarouselImage("apartamento-gomes-carvalho-06.webp") },
  { title: "Sala compacta", image: homeCarouselImage("apartamento_pequeno48m2_2.jpg") },
  { title: "Armários e circulação", image: homeCarouselImage("apartamento_pequeno48m2_3.jpg") },
  { title: "Cozinha integrada", image: homeCarouselImage("apartamento_pequeno48m2_5.jpg") },
  { title: "Circulação e aproveitamento", image: homeCarouselImage("apartamento_pequeno48m2_6.jpg") },
  { title: "Sala e cozinha", image: homeCarouselImage("apartamento_pequeno48m2_7.jpg") },
  { title: "Hall e armazenamento", image: homeCarouselImage("apartamento_pequeno48m2_11.jpg") },
  { title: "Ambientes planejados", image: homeCarouselImage("apartamento_pequeno48m2_12.jpg") },
];
const defaultTechnicalAttributes: ApartmentAttribute[] = [
  { label: "Endereço completo com CEP", value: "" },
  { label: "Área total (m²)", value: "" },
  { label: "Suítes", value: "" },
  { label: "Banheiros e lavabos", value: "" },
  { label: "Vagas de garagem", value: "" },
  { label: "Posição solar", value: "" },
  { label: "Acabamentos", value: "" },
  { label: "Lazer do condomínio", value: "" },
  { label: "Segurança", value: "" },
];
const defaultFinancialAttributes: ApartmentAttribute[] = [
  { label: "Condomínio mensal", value: "" },
  { label: "IPTU (parcela)", value: "" },
  { label: "Escritura e registro (RGI)", value: "" },
  { label: "Aceita financiamento bancário", value: "" },
  { label: "Aceita FGTS", value: "" },
];
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

function residentialDisplayName(apartments: Apartment[], residentialNumber: number) {
  const customName = apartments.find((apartment) => apartment.residential_number === residentialNumber)?.residential_name?.trim();
  return customName || `Residencial Plenitude ${romanNumeral(residentialNumber)}`;
}

function normalizeResidentialName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
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
  const [selectedResidential, setSelectedResidential] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("disponivel");
  const [search, setSearch] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [homeGalleryIndex, setHomeGalleryIndex] = useState(0);
  const [homeGalleryHovered, setHomeGalleryHovered] = useState(false);
  const [homeGalleryFocused, setHomeGalleryFocused] = useState(false);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [editResidential, setEditResidential] = useState("13");
  const [editApartment, setEditApartment] = useState("1");
  const [creatingResidential, setCreatingResidential] = useState(false);
  const [newResidentialName, setNewResidentialName] = useState("");
  const [floorCounts, setFloorCounts] = useState([{ count: "3" }, { count: "3" }]);
  const [editStatus, setEditStatus] = useState<ApartmentStatus>("disponivel");
  const [editPrice, setEditPrice] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editBedrooms, setEditBedrooms] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTechnicalAttributes, setEditTechnicalAttributes] = useState<ApartmentAttribute[]>(defaultTechnicalAttributes);
  const [editTechnicalExtra, setEditTechnicalExtra] = useState("");
  const [editFinancialAttributes, setEditFinancialAttributes] = useState<ApartmentAttribute[]>(defaultFinancialAttributes);
  const [editFinancialExtra, setEditFinancialExtra] = useState("");

  const fetchApartments = useCallback(async (): Promise<Apartment[] | null> => {
    if (!supabase) {
      setLoading(false);
      setLoadError("Configure o Supabase para carregar a disponibilidade atualizada dos imóveis.");
      return null;
    }

    setLoadError("");
    const { data, error } = await supabase
      .from("apartments")
      .select("id,residential_number,residential_name,apartment_number,floor,status,price,area,bedrooms,description,technical_attributes,technical_extra,financial_attributes,financial_extra,updated_at")
      .order("residential_number")
      .order("apartment_number");
    if (error) {
      setLoadError(`Não foi possível carregar os apartamentos: ${error.message}`);
      setLoading(false);
      return null;
    } else {
      const loadedApartments = (data ?? []) as Apartment[];
      setApartments(loadedApartments);
      setLoading(false);
      return loadedApartments;
    }
  }, []);

  const residentialNumbers = useMemo(
    () => [...new Set(apartments.map((apartment) => apartment.residential_number))].sort((a, b) => a - b),
    [apartments],
  );
  const filterResidentialNumbers = residentialNumbers
    .slice(-3)
    .filter((number) => apartments.some((apartment) => apartment.residential_number === number && apartment.status !== "vendido"));
  const selectedFilterResidential = filterResidentialNumbers.includes(Number(selectedResidential))
    ? selectedResidential
    : String(filterResidentialNumbers[0] ?? "");
  const recentResidentials = residentialNumbers.slice(-3).map((number) => ({ number, roman: romanNumeral(number) }));
  const activeHomeGallerySlide = homeGallerySlides[homeGalleryIndex];

  useEffect(() => {
    if (homeGalleryHovered || homeGalleryFocused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setHomeGalleryIndex((index) => (index + 1) % homeGallerySlides.length),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [homeGalleryFocused, homeGalleryHovered]);

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
    const matchesResidential = selectedFilterResidential !== "" && apartment.residential_number === Number(selectedFilterResidential);
    const matchesStatus = selectedStatus === "todos" || apartment.status === selectedStatus;
    const term = search.trim().toLocaleLowerCase("pt-BR");
    const matchesSearch = !term
      || `residencial plenitude ${romanNumeral(apartment.residential_number)}`.toLocaleLowerCase("pt-BR").includes(term)
      || residentialDisplayName(apartments, apartment.residential_number).toLocaleLowerCase("pt-BR").includes(term)
      || `apartamento ${unitDisplayNumber(apartments, apartment)}`.includes(term)
      || String(unitDisplayNumber(apartments, apartment)).includes(term)
      || String(apartment.apartment_number).includes(term);
    return matchesResidential && matchesStatus && matchesSearch;
  }), [apartments, search, selectedFilterResidential, selectedStatus]);

  const visibleApartments = filteredApartments;
  const availableCount = apartments.filter((apartment) => apartment.status === "disponivel").length;
  const negotiationCount = apartments.filter((apartment) => apartment.status === "negociacao").length;
  const residentialCount = new Set(filteredApartments.map((apartment) => apartment.residential_number)).size;
  const totalResidentialCount = Math.max(13, residentialNumbers.length);
  const totalApartmentCount = Math.max(78, apartments.length);

  function populateEdit(record: Apartment | undefined) {
    if (!record) {
      setEditStatus("confirmar");
      setEditPrice("");
      setEditArea("");
      setEditBedrooms("");
      setEditDescription("");
      setEditTechnicalAttributes(defaultTechnicalAttributes.map((attribute) => ({ ...attribute })));
      setEditTechnicalExtra("");
      setEditFinancialAttributes(defaultFinancialAttributes.map((attribute) => ({ ...attribute })));
      setEditFinancialExtra("");
      return;
    }
    setEditStatus(record.status);
    setEditPrice(record.price ? String(record.price) : "");
    setEditArea(record.area ? String(record.area) : "");
    setEditBedrooms(record.bedrooms == null ? "" : String(record.bedrooms));
    setEditDescription(record.description);
    setEditTechnicalAttributes(record.technical_attributes?.length
      ? record.technical_attributes.map((attribute) => ({ ...attribute }))
      : defaultTechnicalAttributes.map((attribute) => ({ ...attribute })));
    setEditTechnicalExtra(record.technical_extra ?? "");
    setEditFinancialAttributes(record.financial_attributes?.length
      ? record.financial_attributes.map((attribute) => ({ ...attribute }))
      : defaultFinancialAttributes.map((attribute) => ({ ...attribute })));
    setEditFinancialExtra(record.financial_extra ?? "");
  }

  function prepareEdit(residential: string, apartment: string) {
    const selectableResidentialNumbers = [...new Set(apartments.map((item) => item.residential_number))]
      .sort((first, second) => first - second)
      .slice(-3);
    const selectedResidential = selectableResidentialNumbers.includes(Number(residential))
      ? residential
      : String(selectableResidentialNumbers[selectableResidentialNumbers.length - 1] ?? "");
    const residentialApartments = apartments
      .filter((item) => item.residential_number === Number(selectedResidential))
      .sort((first, second) => first.apartment_number - second.apartment_number);
    const selectedApartment = residentialApartments.some((item) => item.apartment_number === Number(apartment))
      ? apartment
      : String(residentialApartments[0]?.apartment_number ?? "");
    setEditResidential(selectedResidential);
    setEditApartment(selectedApartment);
    const record = residentialApartments.find((item) => item.apartment_number === Number(selectedApartment));
    populateEdit(record);
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
    const priceInput = editPrice.trim();
    const price = priceInput ? Number(priceInput.replace(",", ".")) : null;
    const area = editArea ? Number(editArea.replace(",", ".")) : null;
    const bedrooms = editBedrooms.trim() ? Number(editBedrooms) : null;
    if ((price !== null && (!Number.isFinite(price) || price <= 0))
      || (area !== null && (!Number.isFinite(area) || area <= 0))
      || (bedrooms !== null && (!Number.isInteger(bedrooms) || bedrooms < 0 || bedrooms > 20))) {
      setToast("Confira o valor, a área e a quantidade de quartos informados.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("apartments")
      .update({
        status: editStatus,
        price,
        area,
        bedrooms,
        description: editDescription.trim(),
        technical_attributes: editTechnicalAttributes,
        technical_extra: editTechnicalExtra.trim(),
        financial_attributes: editFinancialAttributes,
        financial_extra: editFinancialExtra.trim(),
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

  async function handleDeleteApartment() {
    if (!supabase || !isAdmin) return;
    const record = apartments.find((item) => item.residential_number === Number(editResidential) && item.apartment_number === Number(editApartment));
    if (!record) return;
    const apartmentName = `Apartamento ${unitDisplayNumber(apartments, record)}`;
    const residentialName = residentialDisplayName(apartments, record.residential_number);
    if (!window.confirm(`Excluir ${apartmentName} de ${residentialName}?\n\nEsta ação é permanente e não pode ser desfeita.`)) return;

    setBusy(true);
    const { data, error } = await supabase
      .from("apartments")
      .delete()
      .eq("id", record.id)
      .select("id");
    setBusy(false);
    if (error) {
      setToast(`Não foi possível excluir o apartamento: ${error.message}`);
      return;
    }
    if (!data?.length) {
      setToast("O apartamento não foi excluído. Confira se a migração de exclusão foi executada e tente novamente.");
      return;
    }

    const remainingApartments = await fetchApartments();
    const nextRecord = remainingApartments?.find((item) => item.residential_number === record.residential_number)
      ?? remainingApartments?.[remainingApartments.length - 1];
    if (nextRecord) {
      setEditResidential(String(nextRecord.residential_number));
      setEditApartment(String(nextRecord.apartment_number));
      populateEdit(nextRecord);
    } else {
      setAdminOpen(false);
    }
    setToast(`${apartmentName} excluído.`);
  }

  async function handleDeleteResidential() {
    if (!supabase || !isAdmin) return;
    const residentialNumber = Number(editResidential);
    const residentialApartments = apartments.filter((item) => item.residential_number === residentialNumber);
    if (!residentialApartments.length) return;
    const residentialName = residentialDisplayName(apartments, residentialNumber);
    const apartmentCount = residentialApartments.length;
    if (!window.confirm(`Excluir ${residentialName} e suas ${apartmentCount} unidades?\n\nEsta ação é permanente e não pode ser desfeita.`)) return;

    setBusy(true);
    const { data, error } = await supabase
      .from("apartments")
      .delete()
      .eq("residential_number", residentialNumber)
      .select("id");
    setBusy(false);
    if (error) {
      setToast(`Não foi possível excluir o residencial: ${error.message}`);
      return;
    }
    if (data?.length !== apartmentCount) {
      setToast("Nem todas as unidades foram excluídas. Atualize os dados e confira se a migração de exclusão foi executada.");
      await fetchApartments();
      return;
    }

    const remainingApartments = await fetchApartments();
    const nextRecord = remainingApartments?.[remainingApartments.length - 1];
    if (nextRecord) {
      setEditResidential(String(nextRecord.residential_number));
      setEditApartment(String(nextRecord.apartment_number));
      populateEdit(nextRecord);
    } else {
      setAdminOpen(false);
    }
    setToast(`${residentialName} e suas ${apartmentCount} unidades foram excluídos.`);
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
    if (apartmentCount > 32767) {
      setToast("A quantidade informada ultrapassa o limite permitido.");
      return;
    }

    setBusy(true);
    const { data: latestResidential, error: lookupError } = await supabase
      .from("apartments")
      .select("residential_number")
      .order("residential_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lookupError) {
      setBusy(false);
      setToast(`Não foi possível verificar os residenciais existentes: ${lookupError.message}`);
      return;
    }

    const residentialNumber = (latestResidential?.residential_number ?? 0) + 1;
    if (residentialNumber > 32767) {
      setBusy(false);
      setToast("A quantidade informada ultrapassa o limite permitido.");
      return;
    }
    const residentialName = newResidentialName.trim();
    if (!residentialName) {
      setBusy(false);
      setToast("Informe o nome do residencial.");
      return;
    }

    const normalizedResidentialName = normalizeResidentialName(residentialName);
    const duplicateResidential = apartments.find(
      (apartment) => normalizeResidentialName(residentialDisplayName(apartments, apartment.residential_number)) === normalizedResidentialName,
    );
    if (duplicateResidential) {
      setBusy(false);
      setToast(`Já existe um residencial chamado "${residentialDisplayName(apartments, duplicateResidential.residential_number)}". Informe outro nome.`);
      return;
    }

    const newApartments = floorCounts.flatMap(({ count }, floorIndex) =>
      Array.from({ length: Number(count) }, (_, position) => ({
        residential_number: residentialNumber,
        residential_name: residentialName,
        apartment_number: floorCounts
          .slice(0, floorIndex)
          .reduce((total, floor) => total + Number(floor.count), 0) + position + 1,
        floor: floorLabel(floorIndex),
      })),
    );

    const { error } = await supabase.from("apartments").insert(newApartments);
    setBusy(false);
    if (error) {
      setToast(`Não foi possível criar o residencial: ${error.message}`);
      return;
    }

    setToast(`${residentialName} criado com ${apartmentCount} apartamentos.`);
    setCreatingResidential(false);
    setNewResidentialName("");
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
  const updateAttribute = (
    attributes: ApartmentAttribute[],
    setAttributes: (attributes: ApartmentAttribute[]) => void,
    index: number,
    field: keyof ApartmentAttribute,
    value: string,
  ) => setAttributes(attributes.map((attribute, attributeIndex) =>
    attributeIndex === index ? { ...attribute, [field]: value } : attribute));

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
          <a className="nav-contact" href={`https://wa.me/${consultantWhatsappNumber}?text=${encodeURIComponent("Olá! Vim do site e quero saber mais sobre os apartamentos Plenitude.")}`} target="_blank" rel="noreferrer">Fale com um consultor <ArrowRight size={15} /></a>
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
            <h1>Seu próximo<br />capítulo começa <em>aqui.</em></h1>
            <p>Conforto, tranquilidade e um cantinho só seu.<br className="desktop-break" /> Conheça os apartamentos Plenitude.</p>
            <a className="hero-cta" href="#imoveis">Encontre seu apartamento <ArrowDown size={16} /></a>
          </div>
          <div
            className="hero-gallery"
            aria-label="Galeria de fotos dos residenciais"
            onMouseEnter={() => setHomeGalleryHovered(true)}
            onMouseLeave={() => setHomeGalleryHovered(false)}
            onFocusCapture={() => setHomeGalleryFocused(true)}
            onBlurCapture={(event) => {
              if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
                setHomeGalleryFocused(false);
              }
            }}
          >
            <div className="hero-gallery-frame">
              <img className="hero-gallery-photo" src={activeHomeGallerySlide.image} alt={activeHomeGallerySlide.title} />
              <div className="hero-gallery-caption">
                <span className="hero-gallery-title">{activeHomeGallerySlide.title}</span>
                <span className="hero-gallery-count">{String(homeGalleryIndex + 1).padStart(2, "0")} / {String(homeGallerySlides.length).padStart(2, "0")}</span>
              </div>
            </div>
            <div className="hero-gallery-controls">
              <span>Galeria de inspiração</span>
              <div>
                <button type="button" aria-label="Foto anterior" onClick={() => setHomeGalleryIndex((index) => (index - 1 + homeGallerySlides.length) % homeGallerySlides.length)}><ChevronLeft size={17} /></button>
                <button type="button" aria-label="Próxima foto" onClick={() => setHomeGalleryIndex((index) => (index + 1) % homeGallerySlides.length)}><ChevronRight size={17} /></button>
              </div>
            </div>
            <p className="hero-gallery-disclaimer">Fotos ilustrativas. Exemplo de decoração para apartamento de 48 m².</p>
          </div>
          <div className="hero-footer">
            <div className="hero-note"><span className="note-line" /> Há um Plenitude perfeito para você.</div>
            <div className="hero-index"><strong>+10</strong><span>residenciais<br />construídos</span></div>
          </div>
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
              <select aria-label="Filtrar por residencial" value={selectedFilterResidential} onChange={(event) => setSelectedResidential(event.target.value)}>
                {filterResidentialNumbers.length === 0
                  ? <option value="">Nenhum residencial disponível</option>
                  : filterResidentialNumbers.map((number) => <option value={number} key={number}>{residentialDisplayName(apartments, number)}</option>)}
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
            <span>{selectedFilterResidential === "" ? "NENHUM RESIDENCIAL DISPONÍVEL" : residentialDisplayName(apartments, Number(selectedFilterResidential)).toLocaleUpperCase("pt-BR")}</span>
            <span>{negotiationCount > 0 && selectedStatus === "todos" ? `${negotiationCount} em negociação` : `${residentialCount} empreendimentos`}</span>
          </div>

          {loading
            ? <div className="empty-state"><div className="loading-spinner" /><p>Carregando apartamentos...</p></div>
            : visibleApartments.length === 0
              ? <div className="empty-state"><House size={28} /><h3>{apartments.length === 0 ? "A disponibilidade aparecerá aqui" : "Nenhum apartamento encontrado"}</h3><p>{apartments.length === 0 ? "Assim que o Supabase estiver conectado, os imóveis serão exibidos nesta página." : "Tente mudar os filtros para ver outros apartamentos."}</p></div>
              : <div className="apartment-grid">
                {visibleApartments.map((apartment) => {
                  const technicalAttributes = (apartment.technical_attributes ?? [])
                    .filter((attribute) => attribute.label.trim() && attribute.value.trim());
                  const financialAttributes = (apartment.financial_attributes ?? [])
                    .filter((attribute) => attribute.label.trim() && attribute.value.trim());
                  return <article className="apartment-card" key={apartment.id}>
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
                      <div className="card-residential">{residentialDisplayName(apartments, apartment.residential_number).toLocaleUpperCase("pt-BR")}</div>
                      <h3>Apartamento {unitDisplayNumber(apartments, apartment)}</h3>
                      <div className="apartment-details">
                        <span><DoorOpen size={15} /> {apartment.floor}</span>
                        {apartment.bedrooms != null && <span><BedDouble size={15} /> {apartment.bedrooms} quartos</span>}
                        {apartment.area && <span><MapPin size={14} /> {apartment.area} m²</span>}
                      </div>
                      {apartment.description && <p className="card-description">{apartment.description}</p>}
                      {(technicalAttributes.length > 0 || apartment.technical_extra.trim()) && (
                        <div className="card-attribute-group">
                          <strong>Características</strong>
                          {technicalAttributes.map((attribute, index) => (
                            <p key={`${attribute.label}-${index}`}><span>{attribute.label}</span><strong>{attribute.value}</strong></p>
                          ))}
                          {apartment.technical_extra.trim() && <p>{apartment.technical_extra}</p>}
                        </div>
                      )}
                      {(financialAttributes.length > 0 || apartment.financial_extra.trim()) && (
                        <div className="card-attribute-group">
                          <strong>Informações de venda</strong>
                          {financialAttributes.map((attribute, index) => (
                            <p key={`${attribute.label}-${index}`}><span>{attribute.label}</span><strong>{attribute.value}</strong></p>
                          ))}
                          {apartment.financial_extra.trim() && <p>{apartment.financial_extra}</p>}
                        </div>
                      )}
                      <div className="card-footer">
                        <div><small>VALOR</small><strong>{apartment.price && apartment.price > 0 ? currency(apartment.price) : "A consultar"}</strong></div>
                        {apartment.status === "disponivel"
                          ? <a href={`https://wa.me/${consultantWhatsappNumber}?text=${encodeURIComponent(`Olá! Vim do site e tenho interesse no Apartamento ${unitDisplayNumber(apartments, apartment)} do ${residentialDisplayName(apartments, apartment.residential_number)}.`)}`} target="_blank" rel="noreferrer" className="card-action" aria-label="Consultar apartamento"><ArrowRight size={18} /></a>
                          : <span className="card-status-note">{statuses[apartment.status].label}</span>}
                      </div>
                    </div>
                  </article>;
                })}
              </div>}
          {visibleApartments.length > 0 && (
            <div className="catalog-footer"><span>Exibindo {visibleApartments.length} de {apartments.length} apartamentos</span><span><Check size={14} /> Disponibilidade atualizada pela equipe</span></div>
          )}
        </section>

        <section className="contact-banner">
          <div className="contact-icon"><KeyRound size={23} /></div>
          <div><span className="section-kicker">A GENTE TE AJUDA</span><h2>Encontrou seu lugar?</h2><p>Nosso time está pronto para conversar com você.</p></div>
          <a href={`https://wa.me/${consultantWhatsappNumber}?text=${encodeURIComponent("Olá! Vim do site e quero conhecer os apartamentos Plenitude.")}`} target="_blank" rel="noreferrer">Fale com um consultor <ArrowRight size={16} /></a>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#inicio"><span className="brand-mark"><Building2 size={20} strokeWidth={1.6} /></span><span className="brand-copy"><strong>plenitude</strong><small>RESIDENCIAIS</small></span></a>
        <div className="footer-company-info">
          <strong>PLENITUDE CONSTRUTORA E INCORPORADORA LTDA</strong>
          <span>CNPJ: 30.606.951/0001-70</span>
          <span>© {new Date().getFullYear()} Residenciais Plenitude</span>
        </div>
        <span className="footer-developer">Desenvolvido por Jobson Medeiros · <a href={`https://wa.me/${developerWhatsappNumber}?text=${encodeURIComponent("Olá! Vim pelo site Residenciais Plenitude e gostaria de entrar em contato.")}`} target="_blank" rel="noreferrer">@jmmjp</a></span>
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
              <div><span className="section-kicker">GERENCIAR IMÓVEIS</span><h2 id="admin-title">{creatingResidential ? newResidentialName.trim() || "Novo residencial" : "Painel administrativo"}</h2></div>
              <button type="button" className="secondary-button admin-mode-toggle" onClick={() => setCreatingResidential(!creatingResidential)}>
                {creatingResidential ? <><Pencil size={15} /> Editar unidades</> : <><Plus size={15} /> Novo residencial</>}
              </button>
            </div>
            {creatingResidential ? (
              <>
                <p>Defina o nome do residencial e informe quantos apartamentos serão criados em cada andar.</p>
                <form onSubmit={handleCreateResidential}>
                  <label>Nome do residencial
                    <input type="text" maxLength={100} value={newResidentialName} onChange={(event) => setNewResidentialName(event.target.value)} placeholder="Informe o nome do residencial" required />
                  </label>
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
                {loadError && (
                  <div className="setup-notice error-notice admin-load-error" role="alert">
                    <ShieldCheck size={18} />
                    <span>{loadError} Se o erro mencionar coluna inexistente, execute as migrações SQL pendentes em <code>supabase/</code> e tente novamente.
                      <button type="button" onClick={() => void fetchApartments()} disabled={loading}>
                        {loading ? "Carregando..." : "Tentar carregar novamente"}
                      </button>
                    </span>
                  </div>
                )}
                {!loadError && !loading && apartments.length === 0 && (
                  <div className="setup-notice admin-load-error">
                    <ShieldCheck size={18} />
                    <span>Nenhum apartamento foi encontrado no banco. Crie um residencial ou confira se os dados estão no projeto Supabase configurado.</span>
                  </div>
                )}
                <form onSubmit={handleSave}>
                  <div className="form-row">
                    <label>Residencial
                      <select value={editResidential} onChange={(event) => prepareEdit(event.target.value, editApartment)} onWheel={(event) => changeSelectWithWheel(event, (value) => prepareEdit(value, editApartment))}>
                        {recentResidentials.map(({ number, roman }) => <option value={number} key={roman}>{residentialDisplayName(apartments, number)}</option>)}
                      </select>
                    </label>
                    <label>Apartamento
                      <select value={editApartment} onChange={(event) => prepareEdit(editResidential, event.target.value)} onWheel={(event) => changeSelectWithWheel(event, (value) => prepareEdit(editResidential, value))}>
                        {selectedResidentialApartments.map((apartment) => <option value={apartment.apartment_number} key={apartment.id}>Apartamento {unitDisplayNumber(apartments, apartment)} · {apartment.floor}</option>)}
                      </select>
                    </label>
                  </div>
                  {selectedRecord && <div className="current-apartment"><Building2 size={17} /><span><strong>{residentialDisplayName(apartments, selectedRecord.residential_number)} · Apartamento {unitDisplayNumber(apartments, selectedRecord)}</strong><small>{selectedRecord.floor}</small></span><span className={`status-pill ${statuses[selectedRecord.status].className}`}><i />{statuses[selectedRecord.status].label}</span></div>}
                  <div className="form-row">
                    <label>Situação
                      <select value={editStatus} onChange={(event) => setEditStatus(event.target.value as ApartmentStatus)} onWheel={(event) => changeSelectWithWheel(event, (value) => setEditStatus(value as ApartmentStatus))}>
                        <option value="confirmar">A confirmar</option><option value="disponivel">Disponível</option><option value="negociacao">Em negociação</option><option value="vendido">Vendido</option>
                      </select>
                    </label>
                    <label>Valor do imóvel (R$)
                      <input type="number" min="0.01" step="0.01" inputMode="decimal" value={editPrice} onChange={(event) => setEditPrice(event.target.value)} placeholder="Deixe vazio para exibir A consultar" />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>Área (m²)
                      <input type="number" min="0" step="1" inputMode="decimal" value={editArea} onChange={(event) => setEditArea(event.target.value)} placeholder="Ex.: 52" />
                    </label>
                    <label>Quartos
                      <input type="number" min="0" max="20" step="1" value={editBedrooms} onChange={(event) => setEditBedrooms(event.target.value)} placeholder="Não informado" />
                    </label>
                  </div>
                  <label className="description-label">Informações do apartamento
                    <textarea rows={3} maxLength={500} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} placeholder="Descreva os diferenciais deste apartamento..." />
                  </label>
                  <section className="attribute-editor">
                    <h3>Ficha técnica</h3>
                    <div className="attribute-list">
                      {editTechnicalAttributes.map((attribute, index) => (
                        <div className="attribute-row" key={`technical-${index}`}>
                          <input aria-label="Nome do atributo técnico" value={attribute.label} onChange={(event) => updateAttribute(editTechnicalAttributes, setEditTechnicalAttributes, index, "label", event.target.value)} placeholder="Atributo (ex.: Posição solar)" />
                          <input aria-label="Valor do atributo técnico" value={attribute.value} onChange={(event) => updateAttribute(editTechnicalAttributes, setEditTechnicalAttributes, index, "value", event.target.value)} placeholder="Informação" />
                          <button type="button" className="remove-attribute-button" onClick={() => setEditTechnicalAttributes((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remover atributo técnico"><X size={15} /></button>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="secondary-button add-attribute-button" onClick={() => setEditTechnicalAttributes((current) => [...current, { label: "", value: "" }])}><Plus size={15} /> Adicionar atributo</button>
                    <label className="description-label">Informação técnica extra
                      <textarea rows={2} maxLength={1000} value={editTechnicalExtra} onChange={(event) => setEditTechnicalExtra(event.target.value)} placeholder="Informações adicionais sobre o imóvel..." />
                    </label>
                  </section>
                  <section className="attribute-editor">
                    <h3>Informações financeiras e de venda</h3>
                    <div className="attribute-list">
                      {editFinancialAttributes.map((attribute, index) => (
                        <div className="attribute-row" key={`financial-${index}`}>
                          <input aria-label="Nome do atributo financeiro" value={attribute.label} onChange={(event) => updateAttribute(editFinancialAttributes, setEditFinancialAttributes, index, "label", event.target.value)} placeholder="Atributo (ex.: Condomínio mensal)" />
                          <input aria-label="Valor do atributo financeiro" value={attribute.value} onChange={(event) => updateAttribute(editFinancialAttributes, setEditFinancialAttributes, index, "value", event.target.value)} placeholder="Informação" />
                          <button type="button" className="remove-attribute-button" onClick={() => setEditFinancialAttributes((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remover atributo financeiro"><X size={15} /></button>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="secondary-button add-attribute-button" onClick={() => setEditFinancialAttributes((current) => [...current, { label: "", value: "" }])}><Plus size={15} /> Adicionar atributo</button>
                    <label className="description-label">Informação financeira extra
                      <textarea rows={2} maxLength={1000} value={editFinancialExtra} onChange={(event) => setEditFinancialExtra(event.target.value)} placeholder="Condições de pagamento, propostas ou outras informações..." />
                    </label>
                  </section>
                  <section className="delete-actions" aria-label="Ações de exclusão">
                    <h3>Excluir dados</h3>
                    <p>As exclusões são permanentes e exigem confirmação.</p>
                    <div>
                      <button type="button" className="danger-button" onClick={() => void handleDeleteApartment()} disabled={busy || !selectedRecord}>Excluir apartamento</button>
                      <button type="button" className="danger-button" onClick={() => void handleDeleteResidential()} disabled={busy || !selectedResidentialApartments.length}>Excluir residencial e unidades</button>
                    </div>
                  </section>
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

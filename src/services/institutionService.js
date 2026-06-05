export const INSTITUTIONS_BY_COUNTRY = {
  BR: [
    { id: "nubank",    label: "Nubank",          color: "#820AD1", initials: "NU" },
    { id: "itau",      label: "Itaú",             color: "#EC7000", initials: "IT" },
    { id: "xp",        label: "XP",               color: "#94a3b8", initials: "XP" },
    { id: "btg",       label: "BTG",              color: "#60a5fa", initials: "BT" },
    { id: "bb",        label: "Banco do Brasil",  color: "#f59e0b", initials: "BB" },
    { id: "santander", label: "Santander",        color: "#ef4444", initials: "SA" },
    { id: "inter",     label: "Inter",            color: "#FF7A00", initials: "IN" },
    { id: "bradesco",  label: "Bradesco",         color: "#e03232", initials: "BR" },
    { id: "c6",        label: "C6 Bank",          color: "#94a3b8", initials: "C6" },
    { id: "caixa",     label: "Caixa",            color: "#1d6fa4", initials: "CE" },
    { id: "outro_br",  label: "Outro",            color: "#475569", initials: "+"  },
  ],
  AE: [
    { id: "enbd",      label: "Emirates NBD",     color: "#c5a028", initials: "EN" },
    { id: "adcb",      label: "ADCB",             color: "#60a5fa", initials: "AD" },
    { id: "fab",       label: "FAB",              color: "#a78bfa", initials: "FA" },
    { id: "mashreq",   label: "Mashreq",          color: "#34d399", initials: "MQ" },
    { id: "hsbc",      label: "HSBC UAE",         color: "#ef4444", initials: "HS" },
    { id: "dib",       label: "DIB",              color: "#38bdf8", initials: "DI" },
    { id: "sarwa",     label: "SARWA",            color: "#94a3b8", initials: "SR" },
    { id: "outro_ae",  label: "Outro",            color: "#475569", initials: "+"  },
  ],
  EC: [
    { id: "pichincha",  label: "Pichincha",       color: "#60a5fa", initials: "BP" },
    { id: "guayaquil",  label: "Guayaquil",       color: "#34d399", initials: "BG" },
    { id: "produbanco", label: "Produbanco",      color: "#a78bfa", initials: "PB" },
    { id: "outro_ec",   label: "Outro",           color: "#475569", initials: "+"  },
  ],
};

export const getInstitutionsByCountry = (countryId) =>
  INSTITUTIONS_BY_COUNTRY[countryId] ?? INSTITUTIONS_BY_COUNTRY.BR;

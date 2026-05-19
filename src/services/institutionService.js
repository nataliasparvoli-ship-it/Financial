export const INSTITUTIONS_BY_COUNTRY = {
  BR: [
    { id: "nubank",   label: "Nubank",          color: "#820AD1" },
    { id: "itau",     label: "Itaú",             color: "#EC7000" },
    { id: "xp",       label: "XP",               color: "#f1f5f9" },
    { id: "btg",      label: "BTG",              color: "#60a5fa" },
    { id: "bb",       label: "Banco do Brasil",  color: "#f59e0b" },
    { id: "santander",label: "Santander",        color: "#ef4444" },
    { id: "outro_br", label: "Outro",            color: "#475569" },
  ],
  AE: [
    { id: "enbd",     label: "Emirates NBD",     color: "#34d399" },
    { id: "adcb",     label: "ADCB",             color: "#60a5fa" },
    { id: "fab",      label: "FAB",              color: "#a78bfa" },
    { id: "mashreq",  label: "Mashreq",          color: "#f59e0b" },
    { id: "dib",      label: "DIB",              color: "#34d399" },
    { id: "sarwa",    label: "SARWA",            color: "#f1f5f9" },
    { id: "outro_ae", label: "Outro",            color: "#475569" },
  ],
  EC: [
    { id: "pichincha",   label: "Pichincha",     color: "#60a5fa" },
    { id: "guayaquil",   label: "Guayaquil",     color: "#34d399" },
    { id: "produbanco",  label: "Produbanco",    color: "#a78bfa" },
    { id: "outro_ec",    label: "Outro",         color: "#475569" },
  ],
};

export const getInstitutionsByCountry = (countryId) =>
  INSTITUTIONS_BY_COUNTRY[countryId] ?? INSTITUTIONS_BY_COUNTRY.BR;

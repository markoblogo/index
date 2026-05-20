export type RespondentContact = {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  notificationEmail: string;
  status: "active" | "pending";
};

export const respondentContacts: RespondentContact[] = [
  {
    id: "bunge-ukraine",
    companyName: "ПІІ «БУНГЕ ЮКРЕЙН»",
    contactPerson: "Олена Коваль",
    phone: "+38 (050) 410-12-01",
    notificationEmail: "bunge@uga-index.demo",
    status: "active",
  },
  {
    id: "adm-ukraine",
    companyName: "ТОВ «АДМ ЮКРЕЙН»",
    contactPerson: "Андрій Мельник",
    phone: "+38 (067) 420-18-22",
    notificationEmail: "adm@uga-index.demo",
    status: "active",
  },
  {
    id: "hermes-trading",
    companyName: "ТОВ «Гермес-Трейдінг»",
    contactPerson: "Ірина Савчук",
    phone: "+38 (063) 430-24-33",
    notificationEmail: "hermes@uga-index.demo",
    status: "active",
  },
  {
    id: "louis-dreyfus-ukraine",
    companyName: "ТОВ «Луї Дрейфус Україна»",
    contactPerson: "Максим Бойко",
    phone: "+38 (050) 440-31-44",
    notificationEmail: "ldc@uga-index.demo",
    status: "active",
  },
  {
    id: "kernel-trade",
    companyName: "ТОВ «Кернел-Трейд»",
    contactPerson: "Наталія Гончар",
    phone: "+38 (067) 450-45-55",
    notificationEmail: "kernel@uga-index.demo",
    status: "active",
  },
  {
    id: "cofco-agri-ukraine",
    companyName: "ТОВ «КОФКО АГРІ РЕСУРСІЗ УКРАЇНА»",
    contactPerson: "Дмитро Лисенко",
    phone: "+38 (073) 460-58-66",
    notificationEmail: "cofco@uga-index.demo",
    status: "active",
  },
  {
    id: "new-world-grain-ukraine",
    companyName: "ТОВ «Нью Ворлд Грейн Юкрейн»",
    contactPerson: "Катерина Мороз",
    phone: "+38 (050) 470-62-77",
    notificationEmail: "nwg@uga-index.demo",
    status: "active",
  },
  {
    id: "nibulon",
    companyName: "ТОВ СП «НІБУЛОН»",
    contactPerson: "Сергій Ткаченко",
    phone: "+38 (067) 480-74-88",
    notificationEmail: "nibulon@uga-index.demo",
    status: "active",
  },
  {
    id: "agroprosperis",
    companyName: "ТОВ «Агропросперіс Трейд»",
    contactPerson: "Юлія Петренко",
    phone: "+38 (050) 490-86-19",
    notificationEmail: "agroprosperis@uga-index.demo",
    status: "pending",
  },
  {
    id: "orom",
    companyName: "ТОВ «ОРОМ-ІМПЕКС»",
    contactPerson: "Віталій Шевченко",
    phone: "+38 (063) 510-92-40",
    notificationEmail: "orom@uga-index.demo",
    status: "pending",
  },
  {
    id: "aeroc",
    companyName: "ТОВ «АЕРОК АГРО»",
    contactPerson: "Марина Романюк",
    phone: "+38 (067) 520-13-51",
    notificationEmail: "aeroc@uga-index.demo",
    status: "pending",
  },
  {
    id: "grain-alliance",
    companyName: "ТОВ «Грейн Альянс»",
    contactPerson: "Павло Данилюк",
    phone: "+38 (050) 530-27-62",
    notificationEmail: "grain-alliance@uga-index.demo",
    status: "pending",
  },
];

export const respondentEmailSchedule = {
  enabled: true,
  timezone: "Europe/Kyiv",
  sendTime: "16:30",
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  surveyUrl: "/respondent",
  sender: "UGA Index <noreply@uga-index.demo>",
};

import type { DDT } from '../types';

export const DDT_DATA: DDT[] = [
  {
    numero: '12345',
    data: '2025-07-10',
    mittente: 'Caseificio Molisano',
    destinatario: 'Supermercato Roma',
    prodotti: [
      {
        id: '2',
        nome: 'Mozzarella di Bufala Campana DOP',
        quantita: 100,
        lotto: 'L202507A',
      },
    ],
  },
  {
    numero: '12346',
    data: '2025-07-15',
    mittente: 'Azienda Alimentare S.p.A.',
    destinatario: 'Ristorante Bella Parma',
    prodotti: [
      {
        id: '1',
        nome: 'Salsa Pronta di Pomodoro',
        quantita: 140,
        lotto: 'L202507B',
      },
      {
        id: '3',
        nome: 'Biscotti Frollini al Cacao',
        quantita: 80,
        lotto: 'L202507C',
      },
    ],
  },
];

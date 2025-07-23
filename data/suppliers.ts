import type { Supplier } from '../types';

export const SUPPLIERS_DATA: Supplier[] = [
  {
    id: 'forn01',
    ragioneSociale: 'Azienda Alimentare S.p.A.',
    indirizzo: 'Via Roma 100, Parma',
    certificazioni: ['BIO', 'IFS'],
    contatti: 'info@aziendaalimentare.com',
  },
  {
    id: 'forn02',
    ragioneSociale: 'Caseificio Molisano',
    indirizzo: 'Contrada Fontanelle 12, Campobasso',
    certificazioni: ['DOP'],
    contatti: 'info@caseificiomolisano.it',
  },
  {
    id: 'forn03',
    ragioneSociale: 'Forno Antico',
    indirizzo: 'Via Panificio 9, Firenze',
    certificazioni: ['BRC'],
    contatti: 'contatti@fornoantico.it',
  },
];

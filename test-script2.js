global.window = { __API_BASE_URL__: 'http://localhost' };
import { api } from './js/api.js';
console.log("Imports ok", typeof api.getContent);

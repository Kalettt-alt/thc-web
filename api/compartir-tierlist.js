import { createHandler } from '../supabase/functions/compartir-tierlist/handler.js';
import { getTierListBackendConfig } from '../server/tierListConfig.js';

export default {
  fetch(request) {
    return createHandler(getTierListBackendConfig(process.env))(request);
  },
};

import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas for validation
import { 
  createPolicyHolderInputSchema,
  updatePolicyHolderInputSchema,
  getPolicyHolderInputSchema,
  createInsuranceClaimInputSchema,
  updateInsuranceClaimInputSchema,
  getClaimInputSchema,
  getClaimsByPolicyHolderInputSchema
} from './schema';

// Import handlers
import { createPolicyHolder } from './handlers/create_policy_holder';
import { getPolicyHolders } from './handlers/get_policy_holders';
import { getPolicyHolder } from './handlers/get_policy_holder';
import { updatePolicyHolder } from './handlers/update_policy_holder';
import { createInsuranceClaim } from './handlers/create_insurance_claim';
import { getInsuranceClaims } from './handlers/get_insurance_claims';
import { getInsuranceClaim } from './handlers/get_insurance_claim';
import { updateInsuranceClaim } from './handlers/update_insurance_claim';
import { getClaimsByPolicyHolder } from './handlers/get_claims_by_policy_holder';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // Policy Holder procedures
  createPolicyHolder: publicProcedure
    .input(createPolicyHolderInputSchema)
    .mutation(({ input }) => createPolicyHolder(input)),
    
  getPolicyHolders: publicProcedure
    .query(() => getPolicyHolders()),
    
  getPolicyHolder: publicProcedure
    .input(getPolicyHolderInputSchema)
    .query(({ input }) => getPolicyHolder(input)),
    
  updatePolicyHolder: publicProcedure
    .input(updatePolicyHolderInputSchema)
    .mutation(({ input }) => updatePolicyHolder(input)),
  
  // Insurance Claim procedures
  createInsuranceClaim: publicProcedure
    .input(createInsuranceClaimInputSchema)
    .mutation(({ input }) => createInsuranceClaim(input)),
    
  getInsuranceClaims: publicProcedure
    .query(() => getInsuranceClaims()),
    
  getInsuranceClaim: publicProcedure
    .input(getClaimInputSchema)
    .query(({ input }) => getInsuranceClaim(input)),
    
  updateInsuranceClaim: publicProcedure
    .input(updateInsuranceClaimInputSchema)
    .mutation(({ input }) => updateInsuranceClaim(input)),
    
  getClaimsByPolicyHolder: publicProcedure
    .input(getClaimsByPolicyHolderInputSchema)
    .query(({ input }) => getClaimsByPolicyHolder(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
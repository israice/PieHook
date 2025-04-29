import { GET_all_balances } from "./core/FRONTEND/GET_all_balances.js";

async function run_List() {
  console.time("Speed");

  await GET_all_balances();

  console.timeEnd("Speed");
    setImmediate(run_List, 1000); // REPEAT EVERY 1 SECOND
}

run_List();

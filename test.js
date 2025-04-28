// import { clone_settings } from "./clone_settings.js";
import { GET_all_balances } from "./core/FRONTEND/GET_all_balances.js";

async function run_List() {
  console.time("Speed");

  await GET_all_balances();

  console.timeEnd("Speed");
  //   setImmediate(run_List); // Повторяем
}

run_List();

const message_long_buy = async (): Promise<void> => console.log("--- LONG BUY!");
const message_long_sell = async (): Promise<void> => console.log("--- LONG SELL!");
const message_short_buy = async (): Promise<void> => console.log("--- SHORT BUY!");
const message_short_sell = async (): Promise<void> => console.log("--- SHORT SELL!");
const message_good = async (): Promise<void> => console.log("--- Good!");
const message_ping = async (): Promise<void> => console.log("--- Ping!");

export {
  message_long_buy,
  message_long_sell,
  message_short_buy,
  message_short_sell,
  message_good,
  message_ping,
};

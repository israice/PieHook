import { copyFile } from "fs/promises";

const clone_candle_0 = async () => {
  const src = "CORE/4_Data/A_1m_candle[0].csv";
  const dest = "CORE/4_Data/Z_1m_candle[0].csv";

  try {
    await copyFile(src, dest);
    console.log("✅ Finish...");
  } catch (err) {
    console.error("✗ Ошибка копирования:", err.message);
  }
};

export { clone_candle_0 };

import { copyFile } from 'fs/promises';

const clone_candle_0 = async () => {
  const src = '4-Data/A_1m_candle[0].csv';
  const dest = '4-Data/Z_1m_candle[0].csv';
  
  try {
    await copyFile(src, dest);
    console.log('✅ Копия свечи [0] успешно сохранена.');
  } catch (err) {
    console.error('✗ Ошибка копирования:', err.message);
  }
};

export { clone_candle_0 };
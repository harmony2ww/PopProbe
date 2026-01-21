// 预置的配置文件
import china from './2024China.json';
import japan from './2025Japan.json';
import taiwan from './2024Taiwan.json';
import usa from './2024USA.json';

export const presetConfigs = {
  china: { ...china, id: 'china', flag: '🇨🇳' },
  japan: { ...japan, id: 'japan', flag: '🇯🇵' },
  taiwan: { ...taiwan, id: 'taiwan', flag: '🇹🇼' },
  usa: { ...usa, id: 'usa', flag: '🇺🇸' }
};

export const configList = Object.values(presetConfigs);

// 国际化配置
export const translations = {
  en: {
    // Header
    appName: 'PopProbe',
    appSubtitle: 'Population Simulator',
    loaded: 'Loaded',
    
    // Country Selection
    selectCountry: 'Select Country/Region',
    uploadJson: 'Upload JSON',
    custom: 'Custom',
    dataSource: 'Data Source',
    initialPop: 'Initial Population',
    
    // Parameters
    paramSettings: 'Parameter Settings',
    endYear: 'End Year',
    calculate: 'Calculate',
    calculating: 'Calculating...',
    tfr: 'Total Fertility Rate (TFR)',
    lifeExpectancy: 'Life Expectancy',
    childAge: 'Mean Childbearing Age',
    years: 'years',
    add: 'Add',
    
    // Results
    results: 'Projection Results',
    yearLabel: 'Year',
    population: 'Population',
    popYear: 'Population',
    births: 'Births',
    deaths: 'Deaths',
    growth: 'Growth',
    agingRate: 'Aging Rate',
    change: 'Change',
    
    // Charts
    totalPopChange: 'Total Population',
    birthDeath: 'Births & Deaths',
    ageStructure: 'Age Structure',
    agingTfr: 'Aging Rate & TFR',
    age0_14: '0-14 years',
    age15_64: '15-64 years',
    age65plus: '65+ years',
    perYear: '/year',
    
    // Table
    keyYears: 'Key Years',
    allYears: 'All Years',
    year: 'Year',
    totalPop: 'Total Pop',
    birthsWan: 'Births(10k)',
    deathsWan: 'Deaths(10k)',
    growthWan: 'Growth(10k)',
    le: 'Life Exp.',
    
    // Units
    yi: '100M',
    wan: '10k',
    thousand: 'k',
    
    // Empty state
    pleaseSelect: 'Please select a country/region or upload a config file',
    selectAbove: 'Select a preset above or upload a custom JSON file to start',
    
    // Language
    language: 'Language',
    langZh: '中文',
    langEn: 'English'
  },
  zh: {
    // Header
    appName: 'PopProbe',
    appSubtitle: '人口模拟器',
    loaded: '已加载',
    
    // Country Selection
    selectCountry: '选择国家/地区',
    uploadJson: '上传JSON',
    custom: '自定义',
    dataSource: '数据来源',
    initialPop: '初始人口',
    
    // Parameters
    paramSettings: '参数设置',
    endYear: '预测结束年份',
    calculate: '开始计算',
    calculating: '计算中...',
    tfr: '总和生育率 (TFR)',
    lifeExpectancy: '预期寿命',
    childAge: '平均生育年龄',
    years: '岁',
    add: '添加',
    
    // Results
    results: '预测结果',
    yearLabel: '年',
    population: '人口',
    popYear: '年人口',
    births: '出生',
    deaths: '死亡',
    growth: '增长',
    agingRate: '老龄化率',
    change: '变化',
    
    // Charts
    totalPopChange: '总人口变化',
    birthDeath: '出生与死亡',
    ageStructure: '年龄结构变化',
    agingTfr: '老龄化率与TFR',
    age0_14: '0-14岁',
    age15_64: '15-64岁',
    age65plus: '65岁以上',
    perYear: '/年',
    
    // Table
    keyYears: '关键年份',
    allYears: '全部数据',
    year: '年份',
    totalPop: '总人口',
    birthsWan: '出生(万)',
    deathsWan: '死亡(万)',
    growthWan: '增长(万)',
    le: '预期寿命',
    
    // Units
    yi: '亿',
    wan: '万',
    thousand: '千',
    
    // Empty state
    pleaseSelect: '请选择国家/地区或上传配置文件',
    selectAbove: '选择上方的预置配置或上传自定义JSON文件开始预测',
    
    // Language
    language: '语言',
    langZh: '中文',
    langEn: 'English'
  }
};

// 检测浏览器语言
export function detectLanguage() {
  const browserLang = navigator.language || navigator.userLanguage;
  return browserLang.startsWith('zh') ? 'zh' : 'en';
}

// 获取翻译
export function t(lang, key) {
  return translations[lang]?.[key] || translations['en'][key] || key;
}

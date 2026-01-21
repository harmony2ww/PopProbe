// 人口预测模拟器核心逻辑 - 从Python版本移植
const MIN_FERTILITY_AGE = 15;
const MAX_FERTILITY_AGE = 49;
const MAX_AGE = 100;

// 单位转换到千人
function convertToThousands(population, unit) {
  const unitLower = (unit || '').toLowerCase();
  
  if (['万人', '万', 'ten thousand', 'ten_thousand', 'wan', '10000'].includes(unit) || 
      ['ten thousand', 'ten_thousand', 'wan', '10000'].includes(unitLower)) {
    return population.map(p => p * 10);
  } else if (['人'].includes(unit) || ['person', 'persons', 'people', '1'].includes(unitLower)) {
    return population.map(p => p / 1000);
  } else if (['million', 'millions', '1000000'].includes(unitLower)) {
    return population.map(p => p * 1000);
  } else if (['亿人', '亿', 'hundred million', 'hundred_million', 'yi', '100000000'].includes(unit) ||
             ['hundred million', 'hundred_million', 'yi', '100000000'].includes(unitLower)) {
    return population.map(p => p * 100000);
  }
  return population;
}

// 展开5岁组为单岁人口
function expandToSingleAges(ageGroups, unit) {
  const population = new Array(MAX_AGE + 1).fill(0);
  const mappings = [
    ['0-4岁', 0, 4], ['5-9岁', 5, 9], ['10-14岁', 10, 14], ['15-19岁', 15, 19],
    ['20-24岁', 20, 24], ['25-29岁', 25, 29], ['30-34岁', 30, 34], ['35-39岁', 35, 39],
    ['40-44岁', 40, 44], ['45-49岁', 45, 49], ['50-54岁', 50, 54], ['55-59岁', 55, 59],
    ['60-64岁', 60, 64], ['65-69岁', 65, 69], ['70-74岁', 70, 74], ['75-79岁', 75, 79],
    ['80-84岁', 80, 84], ['85-89岁', 85, 89], ['90-94岁', 90, 94], ['95岁以上', 95, 100]
  ];
  
  mappings.forEach(([name, start, end]) => {
    if (ageGroups[name] !== undefined) {
      const perAge = ageGroups[name] / (end - start + 1);
      for (let age = start; age <= end; age++) {
        population[age] = perAge;
      }
    }
  });
  
  return convertToThousands(population, unit);
}

// 线性插值
function interpolate(year, values) {
  const years = Object.keys(values).map(Number).sort((a, b) => a - b);
  if (year <= years[0]) return values[years[0]];
  if (year >= years[years.length - 1]) return values[years[years.length - 1]];
  
  for (let i = 0; i < years.length - 1; i++) {
    if (year >= years[i] && year <= years[i + 1]) {
      const ratio = (year - years[i]) / (years[i + 1] - years[i]);
      return values[years[i]] + (values[years[i + 1]] - values[years[i]]) * ratio;
    }
  }
  return values[years[0]];
}

// Beta分布生育率
function generateFertilityDistribution(meanAge, stdDev = 5.5) {
  const range = MAX_FERTILITY_AGE - MIN_FERTILITY_AGE;
  let mu = Math.max(0.02, Math.min(0.98, (meanAge - MIN_FERTILITY_AGE) / range));
  let sigma = Math.max(0.02, Math.min(0.25, stdDev / range));
  let variance = sigma ** 2;
  if (variance >= mu * (1 - mu)) variance = mu * (1 - mu) * 0.9;
  
  const kappa = Math.max(2, mu * (1 - mu) / variance - 1);
  const alpha = mu * kappa;
  const beta = (1 - mu) * kappa;
  
  const dist = {};
  let total = 0;
  for (let age = MIN_FERTILITY_AGE; age <= MAX_FERTILITY_AGE; age++) {
    const x = Math.max(0.001, Math.min(0.999, (age - MIN_FERTILITY_AGE) / range));
    const pdf = Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1);
    dist[age] = pdf;
    total += pdf;
  }
  for (let age in dist) dist[age] /= total;
  return dist;
}

// Gompertz死亡率模型
function buildMortalityRates(lifeExpectancy) {
  let bestA = 0.00003, bestB = 0.085, bestDiff = Infinity;
  
  for (const a of [0.00001, 0.000015, 0.00002, 0.000025, 0.00003, 0.000035, 0.00004, 0.000045, 0.00005]) {
    for (const b of [0.070, 0.075, 0.080, 0.085, 0.090, 0.095, 0.100]) {
      const rates = [];
      for (let age = 0; age <= MAX_AGE; age++) {
        let rate;
        if (age === 0) rate = 0.005;
        else if (age <= 4) rate = 0.001;
        else if (age <= 14) rate = 0.0003;
        else rate = a * Math.exp(b * age);
        rates.push(Math.min(rate, 1));
      }
      rates[MAX_AGE] = 1;
      
      let survival = 1, totalYears = 0;
      for (let age = 0; age < rates.length; age++) {
        totalYears += survival;
        survival *= (1 - rates[age]);
      }
      
      const diff = Math.abs(totalYears - lifeExpectancy);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestA = a;
        bestB = b;
      }
    }
  }
  
  const rates = [];
  for (let age = 0; age <= MAX_AGE; age++) {
    let rate;
    if (age === 0) rate = 0.005;
    else if (age <= 4) rate = 0.001;
    else if (age <= 14) rate = 0.0003;
    else rate = bestA * Math.exp(bestB * age);
    rates.push(Math.min(rate, 1));
  }
  rates[MAX_AGE] = 1;
  return rates;
}

// 运行模拟
export function runSimulation(config, tfrValues, leValues, ageValues, endYear = 2100) {
  const startYear = config.year;
  const sexRatio = config.parameters?.sex_ratio_at_birth || 1.05;
  const femaleRatio = 1 / (1 + sexRatio);
  const fertilityStd = config.parameters?.fertility_std_dev || 5.5;
  
  let population = expandToSingleAges(config.population_by_age_group, config.population_unit);
  const results = [];
  const mortalityCache = {};
  
  for (let year = startYear; year <= endYear; year++) {
    const tfr = interpolate(year, tfrValues);
    const le = interpolate(year, leValues);
    const meanAge = interpolate(year, ageValues);
    
    const totalPop = population.reduce((a, b) => a + b, 0);
    const age0_14 = population.slice(0, 15).reduce((a, b) => a + b, 0);
    const age15_64 = population.slice(15, 65).reduce((a, b) => a + b, 0);
    const age65plus = population.slice(65).reduce((a, b) => a + b, 0);
    
    // 出生计算
    const fertDist = generateFertilityDistribution(meanAge, fertilityStd);
    let births = 0;
    for (let age = MIN_FERTILITY_AGE; age <= MAX_FERTILITY_AGE; age++) {
      births += population[age] * femaleRatio * tfr * fertDist[age];
    }
    
    // 死亡计算
    const leKey = Math.round(le * 2) / 2;
    if (!mortalityCache[leKey]) {
      mortalityCache[leKey] = buildMortalityRates(le);
    }
    const mortRates = mortalityCache[leKey];
    const deathsByAge = population.map((p, i) => p * mortRates[i]);
    const deaths = deathsByAge.reduce((a, b) => a + b, 0);
    
    // 人口老化（第一年使用原始数据，不更新）
    if (year > startYear) {
      const newPop = new Array(MAX_AGE + 1).fill(0);
      newPop[0] = births;
      for (let age = 0; age < MAX_AGE; age++) {
        newPop[age + 1] = Math.max(0, population[age] - deathsByAge[age]);
      }
      population = newPop;
    }
    
    results.push({
      year,
      totalPop,
      births,
      deaths,
      growth: births - deaths,
      age0_14,
      age15_64,
      age65plus,
      agingRate: totalPop > 0 ? (age65plus / totalPop) * 100 : 0,
      dependencyRatio: age15_64 > 0 ? ((age0_14 + age65plus) / age15_64) * 100 : 0,
      tfr,
      le,
      meanAge
    });
  }
  
  return results;
}

// 格式化人口数
export function formatPopulation(val, lang = 'zh') {
  if (lang === 'en') {
    if (val >= 100000) return (val / 100000).toFixed(2) + ' 100M';
    if (val >= 100) return (val / 10).toFixed(0) + ' 10k';
    return val.toFixed(0) + 'k';
  }
  if (val >= 100000) return (val / 100000).toFixed(2) + '亿';
  if (val >= 100) return (val / 10).toFixed(0) + '万';
  return val.toFixed(0) + '千';
}

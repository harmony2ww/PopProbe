import { useEffect, useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import { toPng } from 'html-to-image';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Area, AreaChart, ComposedChart, ReferenceLine 
} from 'recharts';
import { 
  Users, Upload, FileJson, CheckCircle, Sliders, Play, Plus, 
  BarChart3, TrendingDown, UserCheck, Trash2, Globe, Languages, Github, Moon, Sun, Download, Sheet,
  Orbit
} from 'lucide-react';
import { presetConfigs, configList } from './data';
import { runSimulation, formatPopulation } from './simulator';
import { detectLanguage, t } from './i18n';
import './App.css';

// 年份输入模态框
function YearInputModal({ isOpen, onClose, onConfirm, minYear, maxYear, lang }) {
  const [yearInput, setYearInput] = useState('');
  const [error, setError] = useState('');
  
  if (!isOpen) return null;
  
  const handleConfirm = () => {
    const newYear = parseInt(yearInput);
    if (isNaN(newYear) || newYear < minYear || newYear > maxYear + 50) {
      setError(lang === 'zh' ? `请输入 ${minYear}-${maxYear + 50} 之间的年份` : `Please enter a year between ${minYear}-${maxYear + 50}`);
      return;
    }
    setError('');
    setYearInput('');
    onConfirm(newYear);
  };
  
  const handleClose = () => {
    setError('');
    setYearInput('');
    onClose();
  };
  
  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          {lang === 'zh' ? '添加年份节点' : 'Add Year Node'}
        </div>
        <div className="modal-body">
          <input
            type="number"
            className="modal-input"
            placeholder={lang === 'zh' ? '输入年份' : 'Enter year'}
            value={yearInput}
            onChange={e => setYearInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            autoFocus
          />
          {error && <div className="modal-error">{error}</div>}
          <div className="modal-hint">
            {lang === 'zh' ? `范围: ${minYear} - ${maxYear + 50}` : `Range: ${minYear} - ${maxYear + 50}`}
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={handleClose}>
            {lang === 'zh' ? '取消' : 'Cancel'}
          </button>
          <button className="modal-btn confirm" onClick={handleConfirm}>
            {lang === 'zh' ? '确定' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 参数编辑器组件
function ParameterEditor({ title, color, values, onChange, unit, min, max, step, addText, lang }) {
  const [showModal, setShowModal] = useState(false);
  
  const chartData = Object.entries(values)
    .map(([year, value]) => ({ year: parseInt(year), value }))
    .sort((a, b) => a.year - b.year);
  
  const years = Object.keys(values).map(Number).sort((a, b) => a - b);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  
  const handleAddYear = (newYear) => {
    if (values[newYear] !== undefined) {
      return;
    }
    
    // 计算新节点的默认值（线性插值或外推）
    let newValue;
    if (newYear <= minYear) {
      newValue = values[minYear];
    } else if (newYear >= maxYear) {
      newValue = values[maxYear];
    } else {
      let lowerYear = minYear, upperYear = maxYear;
      for (const y of years) {
        if (y < newYear && y > lowerYear) lowerYear = y;
        if (y > newYear && y < upperYear) upperYear = y;
      }
      const v1 = values[lowerYear];
      const v2 = values[upperYear];
      newValue = v1 + (v2 - v1) * (newYear - lowerYear) / (upperYear - lowerYear);
    }
    
    onChange({ ...values, [newYear]: Math.round(newValue * 100) / 100 });
    setShowModal(false);
  };
  
  const updateValue = (year, val) => {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      onChange({ ...values, [year]: Math.max(min, Math.min(max, num)) });
    }
  };
  
  const deleteNode = (year) => {
    if (Object.keys(values).length > 2) {
      const newVals = { ...values };
      delete newVals[year];
      onChange(newVals);
    }
  };

  return (
    <div className="param-card">
      <div className="param-header">
        <div className="param-title">
          <span className="dot" style={{ background: color }}></span>
          {title}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis domain={[min, max]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2}
                dot={{ fill: color, strokeWidth: 2, r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="node-list">
        {Object.entries(values).sort((a, b) => a[0] - b[0]).map(([year, value]) => (
          <div key={year} className="node-item">
            <span className="year">{year}</span>
            <input 
              type="number" 
              value={value} 
              step={step} 
              min={min} 
              max={max}
              onChange={(e) => updateValue(year, e.target.value)} 
            />
            <span className="unit">{unit}</span>
            {Object.keys(values).length > 2 && (
              <button className="node-delete" onClick={() => deleteNode(year)}>
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        <button className="node-add" onClick={() => setShowModal(true)}>
          <Plus size={14} /> {addText}
        </button>
      </div>
      <YearInputModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleAddYear}
        minYear={minYear}
        maxYear={maxYear}
        lang={lang}
      />
    </div>
  );
}

// 自定义Tooltip
function CustomTooltip({ active, payload, label, lang }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="tooltip-title">{label}{lang === 'zh' ? '年' : ''}</div>
      {payload.map((entry, i) => (
        <div key={i} className="tooltip-row">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="tooltip-value">
            {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [lang, setLang] = useState(() => detectLanguage());
  const [theme, setTheme] = useState(() => localStorage.getItem('popprobe-theme') || 'light');
  const [config, setConfig] = useState(null);
  const [tfr, setTfr] = useState({});
  const [le, setLe] = useState({});
  const [age, setAge] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [endYear, setEndYear] = useState(2100);
  const [showAllYears, setShowAllYears] = useState(false);
  const fileInputRef = useRef(null);
  const chartRefs = useRef([]);
  const githubUrl = 'https://github.com/harmony2ww/PopProbe';

  useEffect(() => {
    localStorage.setItem('popprobe-theme', theme);
  }, [theme]);

  // 快捷获取翻译
  const T = (key) => t(lang, key);

  // 加载配置
  const loadConfig = (jsonData) => {
    setConfig(jsonData);
    const params = jsonData.parameters || {};
    setTfr(params.dynamic_tfr?.values || { [jsonData.year]: 1.0 });
    setLe(params.dynamic_life_expectancy?.values || { [jsonData.year]: 78 });
    setAge(params.dynamic_childbearing_age?.values || { [jsonData.year]: 30 });
    setResults(null);
  };

  // 选择预置配置
  const selectPreset = (id) => {
    const preset = presetConfigs[id];
    if (preset) loadConfig(preset);
  };

  // 上传文件
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target.result);
          loadConfig({ ...json, id: 'custom', flag: '📁' });
        } catch (err) {
          alert((lang === 'zh' ? 'JSON解析失败: ' : 'JSON parse failed: ') + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  // 运行模拟
  const runSim = () => {
    if (!config) return;
    setLoading(true);
    setTimeout(() => {
      const res = runSimulation(config, tfr, le, age, endYear);
      setResults(res);
      setLoading(false);
    }, 50);
  };

  const useYi = results && results[0]?.totalPop >= 100000;
  const unitLabel = useYi ? (lang === 'zh' ? '亿人' : '100M') : (lang === 'zh' ? '万人' : '10k');
  
  // 图表数据 - 使用当前语言的标签
  const chartData = results?.map(r => ({
    year: r.year,
    [T('population')]: useYi ? r.totalPop / 100000 : r.totalPop / 10,
    [T('births')]: r.births / 10,
    [T('deaths')]: r.deaths / 10,
    [T('growth')]: r.growth / 10,
    [T('agingRate')]: r.agingRate,
    TFR: r.tfr,
    [T('lifeExpectancy')]: r.le,
    [T('age0_14')]: useYi ? r.age0_14 / 100000 : r.age0_14 / 10,
    [T('age15_64')]: useYi ? r.age15_64 / 100000 : r.age15_64 / 10,
    [T('age65plus')]: useYi ? r.age65plus / 100000 : r.age65plus / 10
  })) || [];

  const startData = results?.[0];
  const endData = results?.[results.length - 1];

  const displayedResults = results
    ? (showAllYears
        ? results
        : results.filter((r, i) => i === 0 || r.year % 10 === 0 || r.year === endYear))
    : [];

  const exportTableCsv = () => {
    if (!displayedResults.length || !config) return;

    const headers = [
      T('year'),
      T('totalPop'),
      T('birthsWan'),
      T('deathsWan'),
      T('growthWan'),
      T('agingRate'),
      'TFR',
      T('le')
    ];

    const rows = displayedResults.map((r) => [
      r.year,
      formatPopulation(r.totalPop, lang),
      (r.births / 10).toFixed(0),
      (r.deaths / 10).toFixed(0),
      (r.growth / 10).toFixed(0),
      `${r.agingRate.toFixed(1)}%`,
      r.tfr.toFixed(2),
      r.le.toFixed(1)
    ]);

    const escapeCsv = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const countryName = getCountryName(config).replace(/[\\/:*?"<>|\\s]+/g, '-');
    const scopeName = showAllYears ? 'all-years' : 'key-years';
    const dateTag = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `popprobe-${countryName}-${scopeName}-${dateTag}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportExcelWithCharts = async () => {
    if (!displayedResults.length || !config) return;

    const workbook = new ExcelJS.Workbook();
    const dataSheet = workbook.addWorksheet(lang === 'zh' ? '人口数据' : 'Population Data');
    const chartsSheet = workbook.addWorksheet(lang === 'zh' ? '图表' : 'Charts');
    const countryName = getCountryName(config);
    const dateTag = new Date().toISOString().slice(0, 10);
    const fileCountryName = countryName.replace(/[\\/:*?"<>|\\s]+/g, '-');

    dataSheet.columns = [
      { header: T('year'), key: 'year', width: 10 },
      { header: T('totalPop'), key: 'population', width: 16 },
      { header: T('birthsWan'), key: 'births', width: 12 },
      { header: T('deathsWan'), key: 'deaths', width: 12 },
      { header: T('growthWan'), key: 'growth', width: 12 },
      { header: T('agingRate'), key: 'agingRate', width: 12 },
      { header: 'TFR', key: 'tfr', width: 10 },
      { header: T('le'), key: 'le', width: 10 }
    ];

    dataSheet.addRows(displayedResults.map((r) => ({
      year: r.year,
      population: formatPopulation(r.totalPop, lang),
      births: (r.births / 10).toFixed(0),
      deaths: (r.deaths / 10).toFixed(0),
      growth: (r.growth / 10).toFixed(0),
      agingRate: `${r.agingRate.toFixed(1)}%`,
      tfr: r.tfr.toFixed(2),
      le: r.le.toFixed(1)
    })));

    const headerRow = dataSheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: theme === 'dark' ? '1E293B' : 'E2E8F0' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    dataSheet.insertRow(1, [
      `${countryName} · ${lang === 'zh' ? '人口预测导出' : 'Population Projection Export'}`
    ]);
    dataSheet.mergeCells('A1:H1');
    dataSheet.getCell('A1').font = { bold: true, size: 14 };
    dataSheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
    dataSheet.insertRow(2, [
      `${lang === 'zh' ? '配置年份' : 'Base Year'}: ${config.year}    ${lang === 'zh' ? '预测至' : 'Projected to'}: ${endYear}    ${lang === 'zh' ? '导出范围' : 'Scope'}: ${showAllYears ? (lang === 'zh' ? '全部年份' : 'All Years') : (lang === 'zh' ? '关键年份' : 'Key Years')}`
    ]);
    dataSheet.mergeCells('A2:H2');
    dataSheet.getCell('A2').font = { color: { argb: '64748B' }, size: 11 };
    dataSheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left' };
    dataSheet.spliceRows(3, 0, []);
    dataSheet.views = [{ state: 'frozen', ySplit: 4 }];

    chartsSheet.columns = [{ width: 24 }, { width: 24 }, { width: 24 }, { width: 24 }];
    chartsSheet.getCell('A1').value = `${countryName} · ${lang === 'zh' ? '图表导出' : 'Chart Export'}`;
    chartsSheet.getCell('A1').font = { bold: true, size: 14 };

    const chartNodes = chartRefs.current.filter(Boolean);
    const imageBackground = theme === 'dark' ? '#162033' : '#f8fafc';
    let currentRow = 3;

    for (let i = 0; i < chartNodes.length; i += 1) {
      const node = chartNodes[i];
      try {
        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: imageBackground
        });
        const imageId = workbook.addImage({
          base64: dataUrl,
          extension: 'png'
        });
        chartsSheet.addImage(imageId, {
          tl: { col: 0, row: currentRow - 1 },
          ext: { width: 960, height: 320 }
        });
        currentRow += 18;
      } catch {
        chartsSheet.getCell(`A${currentRow}`).value = `${lang === 'zh' ? '图表导出失败' : 'Chart export failed'}: ${node.dataset.chartTitle || `Chart ${i + 1}`}`;
        currentRow += 2;
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `popprobe-${fileCountryName}-with-charts-${dateTag}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 切换语言
  const toggleLang = () => setLang(lang === 'zh' ? 'en' : 'zh');

  // 获取国家显示名
  const getCountryName = (cfg) => {
    if (lang === 'en' && cfg.country_en) return cfg.country_en;
    return cfg.country;
  };

  return (
    <div className="app" data-theme={theme}>
      {/* Header */}
      <header className="header">
        <div className="header-main">
          <div className="header-left">
            <div className="logo-shell">
              <Orbit className="logo-image lucide-logo" strokeWidth={1.8} />
            </div>
            <div className="header-copy">
              <div className="hero-kicker">Population Simulator</div>
              <h1>PopProbe</h1>
              <p>{T('appSubtitle')}</p>
            </div>
          </div>
          <div className="header-right">
            <button className="theme-btn" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              {theme === 'light' ? 'Dark' : 'Light'}
            </button>
            <button className="lang-btn" onClick={toggleLang}>
              <Languages size={16} />
              {lang === 'zh' ? 'EN' : '中'}
            </button>
            <a className="github-btn" href={githubUrl} target="_blank" rel="noreferrer">
              <Github size={16} />
              GitHub
            </a>
            {config && (
              <div className="config-badge">
                <CheckCircle size={16} />
                {T('loaded')}: {config.flag} {getCountryName(config)} ({config.year})
              </div>
            )}
          </div>
        </div>
        <div className="hero-summary">
          <div className="summary-panel">
            <span className="summary-panel-label">{lang === 'zh' ? '方法' : 'Method'}</span>
            <strong>{lang === 'zh' ? '队列要素法' : 'Cohort-Component Model'}</strong>
            <span>{lang === 'zh' ? '按年龄结构逐年模拟出生、死亡与老龄化' : 'Simulate births, deaths, and aging year by year'}</span>
          </div>
          <div className="summary-panel">
            <span className="summary-panel-label">{lang === 'zh' ? '输出' : 'Outputs'}</span>
            <strong>{lang === 'zh' ? '人口总量 / 年龄结构 / 老龄化' : 'Population / Age Structure / Aging'}</strong>
            <span>{lang === 'zh' ? '支持预设国家与自定义 JSON 配置' : 'Preset countries plus custom JSON configs'}</span>
          </div>
          <div className="summary-panel accent">
            <span className="summary-panel-label">{lang === 'zh' ? '当前状态' : 'Current State'}</span>
            <strong>{config ? `${config.flag} ${getCountryName(config)}` : (lang === 'zh' ? '等待载入配置' : 'Waiting for configuration')}</strong>
            <span>{results ? `${results[0].year} - ${results[results.length - 1].year}` : (lang === 'zh' ? '先选择国家，再运行模拟' : 'Select a country, then run the simulation')}</span>
          </div>
        </div>
      </header>

      {/* 数据选择 */}
      <div className="card">
        <div className="card-header">
          <div className="card-icon blue"><Globe size={20} /></div>
          <span className="card-title">{T('selectCountry')}</span>
        </div>
        
        <div className="preset-grid">
          {configList.map(item => (
            <button 
              key={item.id}
              className={`preset-btn ${config?.id === item.id ? 'active' : ''}`}
              onClick={() => selectPreset(item.id)}
            >
              <span className="preset-flag">{item.flag}</span>
              <span className="preset-name">{getCountryName(item)}</span>
              <span className="preset-year">{item.year}</span>
            </button>
          ))}
          
          <button className="preset-btn upload" onClick={() => fileInputRef.current?.click()}>
            <Upload size={20} />
            <span className="preset-name">{T('uploadJson')}</span>
            <span className="preset-year">{T('custom')}</span>
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} hidden />
        </div>

        {config && (
          <div className="config-info">
            <div className="info-item">
              <span className="info-label">{T('dataSource')}</span>
              <span className="info-value">{lang === 'en' && config.data_source_en ? config.data_source_en : config.data_source}</span>
            </div>
            <div className="info-item">
              <span className="info-label">{T('initialPop')}</span>
              <span className="info-value">
                {formatPopulation(
                  Object.values(config.population_by_age_group).reduce((a,b)=>a+b,0) * 
                  (config.population_unit === '千人' ? 1 : 
                   config.population_unit === '万人' ? 10 : 
                   config.population_unit === 'person' ? 0.001 : 1),
                  lang
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 参数设置 */}
      {config && (
        <div className="card">
        <div className="card-header">
          <div className="card-icon purple"><Sliders size={20} /></div>
          <span className="card-title">{T('paramSettings')}</span>
        </div>
        <div className="section-intro">
          {lang === 'zh'
            ? '这一段控制的是人口预测的三条核心曲线：生育率、预期寿命和平均生育年龄。你可以把它理解成给模型设定未来几十年的社会情景，再观察总人口、出生死亡和老龄化会怎么变化。'
            : 'This section controls the three core curves behind the projection: fertility, life expectancy, and mean childbearing age. Think of it as defining future social scenarios, then observing how population size, births, deaths, and aging respond over time.'}
        </div>
        <div className="section-intro secondary">
          {lang === 'zh'
            ? '如果你把自己代入一个国家的管理者，长期真正能影响的，基本也就是这几个参数。想提高生育率，往往只能从育儿补贴、住房成本、教育负担、女性就业环境这些地方下手；如果年轻人收入预期变差、养育成本上升、生育和职业发展冲突加剧，生育率通常就会继续下滑。预期寿命更多取决于医疗条件、公共卫生、营养水平和老年照护体系，持续改善这些，寿命才会慢慢抬升。平均生育年龄的变化，则往往反映结婚、生育推迟和城市化进程。也就是说，国家并不能直接“命令人口变化”，真正能调的，通常只有这些慢变量。'
            : 'If you think like a national policymaker, these are basically the few levers you can influence over the long run. To raise fertility, policy usually works indirectly through childcare subsidies, housing affordability, education costs, and the compatibility between parenthood and careers. When income expectations weaken, childrearing costs rise, or work-family conflicts worsen, fertility tends to fall further. Life expectancy is more closely tied to healthcare quality, public health, nutrition, and elderly care systems, so improvements here tend to lift longevity gradually. Mean childbearing age often reflects delayed marriage, delayed childbirth, and urbanization. In other words, governments cannot directly command population outcomes; they can usually only push these slow-moving structural parameters.'}
        </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>{T('endYear')}</label>
              <input 
                type="number" 
                value={endYear} 
                min={config.year + 10} 
                max={2150}
                onChange={(e) => setEndYear(parseInt(e.target.value) || 2100)}
              />
            </div>
            <button className="btn btn-success" onClick={runSim} disabled={loading}>
              <Play size={18} /> {loading ? T('calculating') : T('calculate')}
            </button>
          </div>
          
          <div className="param-grid">
            <ParameterEditor 
              title={T('tfr')} 
              color="#3b82f6"
              values={tfr} 
              onChange={setTfr} 
              unit="" 
              min={0.5} 
              max={3} 
              step={0.05}
              addText={T('add')}
              lang={lang}
            />
            <ParameterEditor 
              title={T('lifeExpectancy')} 
              color="#22c55e"
              values={le} 
              onChange={setLe} 
              unit={T('years')} 
              min={70} 
              max={95} 
              step={0.5}
              addText={T('add')}
              lang={lang}
            />
            <ParameterEditor 
              title={T('childAge')} 
              color="#f97316"
              values={age} 
              onChange={setAge} 
              unit={T('years')} 
              min={25} 
              max={40} 
              step={0.5}
              addText={T('add')}
              lang={lang}
            />
          </div>
        </div>
      )}

      {/* 结果展示 */}
      {results && !loading && (
        <div className="card">
          <div className="card-header">
            <div className="card-icon green"><BarChart3 size={20} /></div>
            <span className="card-title">{T('results')} - {config.flag} {getCountryName(config)}</span>
          </div>
          
          {/* 统计卡片 */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label"><Users size={14} /> {startData.year} {T('popYear')}</div>
              <div className="stat-value">{formatPopulation(startData.totalPop, lang)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><Users size={14} /> {endYear} {T('popYear')}</div>
              <div className="stat-value">{formatPopulation(endData.totalPop, lang)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><TrendingDown size={14} /> {T('change')}</div>
              <div className={`stat-value ${endData.totalPop < startData.totalPop ? 'negative' : 'positive'}`}>
                {((endData.totalPop / startData.totalPop - 1) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><UserCheck size={14} /> {endYear} {T('agingRate')}</div>
              <div className="stat-value negative">{endData.agingRate.toFixed(1)}%</div>
            </div>
          </div>

          {/* 图表 */}
          <div className="charts-grid">
            <div className="chart-card" ref={(node) => { chartRefs.current[0] = node; }} data-chart-title={T('totalPopChange')}>
              <div className="chart-title">{T('totalPopChange')} ({unitLabel})</div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPop" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip lang={lang} />} />
                  <Area type="monotone" dataKey={T('population')} stroke="#3b82f6" fill="url(#colorPop)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card" ref={(node) => { chartRefs.current[1] = node; }} data-chart-title={T('birthDeath')}>
              <div className="chart-title">{T('birthDeath')} ({lang === 'zh' ? '万人/年' : '10k/yr'})</div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip lang={lang} />} />
                  <Legend />
                  <Line type="monotone" dataKey={T('births')} stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey={T('deaths')} stroke="#ef4444" strokeWidth={2} dot={false} />
                  <ReferenceLine y={0} stroke="#cbd5e1" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card" ref={(node) => { chartRefs.current[2] = node; }} data-chart-title={T('ageStructure')}>
              <div className="chart-title">{T('ageStructure')} ({unitLabel})</div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip lang={lang} />} />
                  <Legend />
                  <Area type="monotone" dataKey={T('age0_14')} stackId="1" stroke="#f472b6" fill="#fce7f3" />
                  <Area type="monotone" dataKey={T('age15_64')} stackId="1" stroke="#3b82f6" fill="#dbeafe" />
                  <Area type="monotone" dataKey={T('age65plus')} stackId="1" stroke="#f97316" fill="#ffedd5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card" ref={(node) => { chartRefs.current[3] = node; }} data-chart-title={T('agingTfr')}>
              <div className="chart-title">{T('agingTfr')}</div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 60]} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 3]} />
                  <Tooltip content={<CustomTooltip lang={lang} />} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey={T('agingRate')} stroke="#f97316" strokeWidth={2} dot={false} name={`${T('agingRate')}(%)`} />
                  <Line yAxisId="right" type="monotone" dataKey="TFR" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 数据表格 */}
          <div className="table-section">
            <div className="table-header">
              <div className="chart-title">{showAllYears ? T('allYears') : T('keyYears')}</div>
              <div className="table-controls">
                <button className="export-btn" onClick={exportExcelWithCharts}>
                  <Sheet size={15} />
                  {lang === 'zh' ? '导出 Excel + 图表' : 'Export Excel + Charts'}
                </button>
                <button className="export-btn" onClick={exportTableCsv}>
                  <Download size={15} />
                  {lang === 'zh' ? '导出 CSV' : 'Export CSV'}
                </button>
                <div className="table-toggle">
                  <button 
                    className={`toggle-btn ${!showAllYears ? 'active' : ''}`}
                    onClick={() => setShowAllYears(false)}
                  >
                    {T('keyYears')}
                  </button>
                  <button 
                    className={`toggle-btn ${showAllYears ? 'active' : ''}`}
                    onClick={() => setShowAllYears(true)}
                  >
                    {T('allYears')}
                  </button>
                </div>
              </div>
            </div>
            <div className={`table-wrapper ${showAllYears ? 'scrollable' : ''}`}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{T('year')}</th>
                    <th>{T('totalPop')}</th>
                    <th>{T('birthsWan')}</th>
                    <th>{T('deathsWan')}</th>
                    <th>{T('growthWan')}</th>
                    <th>{T('agingRate')}</th>
                    <th>TFR</th>
                    <th>{T('le')}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedResults.map(r => (
                    <tr key={r.year}>
                      <td className="bold">{r.year}</td>
                      <td>{formatPopulation(r.totalPop, lang)}</td>
                      <td>{(r.births / 10).toFixed(0)}</td>
                      <td>{(r.deaths / 10).toFixed(0)}</td>
                      <td className={r.growth < 0 ? 'negative' : 'positive'}>
                        {(r.growth / 10).toFixed(0)}
                      </td>
                      <td>{r.agingRate.toFixed(1)}%</td>
                      <td>{r.tfr.toFixed(2)}</td>
                      <td>{r.le.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {!config && (
        <div className="card empty-state">
          <FileJson size={48} className="empty-icon" />
          <h3>{T('pleaseSelect')}</h3>
          <p>{T('selectAbove')}</p>
        </div>
      )}
    </div>
  );
}

export default App;

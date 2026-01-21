import { useState, useRef, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Area, AreaChart, ComposedChart, ReferenceLine 
} from 'recharts';
import { 
  Users, Upload, FileJson, CheckCircle, Sliders, Play, Plus, 
  BarChart3, TrendingDown, UserCheck, Trash2, Globe, Languages
} from 'lucide-react';
import { presetConfigs, configList } from './data';
import { runSimulation, formatPopulation } from './simulator';
import { translations, detectLanguage, t } from './i18n';
import './App.css';

// 参数编辑器组件
function ParameterEditor({ title, color, values, onChange, unit, min, max, step, addText }) {
  const chartData = Object.entries(values)
    .map(([year, value]) => ({ year: parseInt(year), value }))
    .sort((a, b) => a.year - b.year);
  
  const addNode = () => {
    const years = Object.keys(values).map(Number);
    const maxYear = Math.max(...years);
    if (maxYear < 2100) {
      const newYear = Math.min(maxYear + 25, 2100);
      if (!values[newYear]) {
        onChange({ ...values, [newYear]: values[maxYear] });
      }
    }
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
        <button className="node-add" onClick={addNode}>
          <Plus size={14} /> {addText}
        </button>
      </div>
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
  const [config, setConfig] = useState(null);
  const [tfr, setTfr] = useState({});
  const [le, setLe] = useState({});
  const [age, setAge] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [endYear, setEndYear] = useState(2100);
  const [showAllYears, setShowAllYears] = useState(false);
  const fileInputRef = useRef(null);

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

  // 切换语言
  const toggleLang = () => setLang(lang === 'zh' ? 'en' : 'zh');

  // 获取国家显示名
  const getCountryName = (cfg) => {
    if (lang === 'en' && cfg.country_en) return cfg.country_en;
    return cfg.country;
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo"><Globe size={24} /></div>
          <div>
            <h1>PopProbe</h1>
            <p>{T('appSubtitle')}</p>
          </div>
        </div>
        <div className="header-right">
          <button className="lang-btn" onClick={toggleLang}>
            <Languages size={16} />
            {lang === 'zh' ? 'EN' : '中'}
          </button>
          {config && (
            <div className="config-badge">
              <CheckCircle size={16} />
              {T('loaded')}: {config.flag} {getCountryName(config)} ({config.year})
            </div>
          )}
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
            <div className="chart-card">
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

            <div className="chart-card">
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

            <div className="chart-card">
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

            <div className="chart-card">
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
                  {(showAllYears 
                    ? results 
                    : results.filter((r, i) => i === 0 || r.year % 10 === 0 || r.year === endYear)
                  ).map(r => (
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

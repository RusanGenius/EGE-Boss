import React from 'react';
import { useApp } from '../store';
import { Card, Button, Switch } from './ui';
import { Subject, TimerModeType } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Download, Upload, Trash2, Clock, MessageSquareOff, CheckSquare, Shield, Monitor } from 'lucide-react';

export function SettingsScreen() {
  const { state, updateSettings, resetData, importData } = useApp();
  const isMonochrome = state.settings.theme === 'monochrome';
  
  const allSubjects: Subject[] = ['Математика', 'Русский язык', 'Информатика', 'Физика', 'Обществознание', 'Биология', 'Химия'];

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showResetModal, setShowResetModal] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);
  const [successText, setSuccessText] = React.useState<string | null>(null);

  // Sync states
  const [syncStatus, setSyncStatus] = React.useState<'idle' | 'loading' | 'entering' | 'confirming'>('idle');
  const [inputCode, setInputCode] = React.useState('');
  const [loadedData, setLoadedData] = React.useState<any>(null);
  const [syncError, setSyncError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const getCreatedAtString = () => {
    if (!state.settings.syncCode || state.settings.syncCode === '------' || !state.settings.syncCodeCreatedAt) {
      return 'код синхронизации не создан';
    }
    try {
      return `создан ${formatDistanceToNow(new Date(state.settings.syncCodeCreatedAt), { locale: ru, addSuffix: true })}`;
    } catch (e) {
      return 'дата создания неизвестна';
    }
  };

  const handleGenerateCode = async () => {
    setSyncStatus('loading');
    setSyncError(null);
    try {
      const response = await fetch('/api/sync/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Ошибка генерации кода');
      }
      
      const formattedCode = data.code.slice(0, 3) + ' ' + data.code.slice(3);
      updateSettings({
        syncCode: formattedCode,
        syncCodeCreatedAt: Date.now()
      });
      setSyncStatus('idle');
    } catch (err: any) {
      setSyncError(err.message || 'Не удалось сгенерировать код.');
      setSyncStatus('idle');
    }
  };

  const handleFetchData = async () => {
    const cleanCode = inputCode.replace(/\s/g, '');
    if (cleanCode.length !== 6 || !/^\d+$/.test(cleanCode)) {
      setSyncError('Код должен состоять из 6 цифр.');
      return;
    }

    setSyncStatus('loading');
    setSyncError(null);
    try {
      const response = await fetch(`/api/sync/load?code=${cleanCode}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Ошибка загрузки данных');
      }
      setLoadedData(data.state);
      setSyncStatus('confirming');
    } catch (err: any) {
      setSyncError(err.message || 'Не удалось загрузить данные по указанному коду.');
      setSyncStatus('idle');
    }
  };

  const handleApplyData = () => {
    if (!loadedData) return;
    importData(loadedData);
    setSyncStatus('idle');
    setInputCode('');
    setLoadedData(null);
    setSuccessText('Данные синхронизированы и применены!');
    setErrorText(null);
    setTimeout(() => setSuccessText(null), 4000);
  };

  const toggleSubject = (subj: Subject) => {
    const isActive = state.settings.activeSubjects.includes(subj);
    if (isActive) {
      if (state.settings.activeSubjects.length > 1) {
        updateSettings({ activeSubjects: state.settings.activeSubjects.filter(s => s !== subj) });
      }
    } else {
      updateSettings({ activeSubjects: [...state.settings.activeSubjects, subj] });
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "egeboss_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && (json.sessions !== undefined || json.settings !== undefined || json.plans !== undefined || json.mockExams !== undefined)) {
          importData(json);
          setSuccessText('Данные успешно импортированы!');
          setErrorText(null);
          setTimeout(() => setSuccessText(null), 4000);
        } else {
          setErrorText('Файл не содержит корректных данных EGE BOSS.');
          setSuccessText(null);
          setTimeout(() => setErrorText(null), 4000);
        }
      } catch (err) {
        setErrorText('Ошибка при чтении JSON-файла.');
        setSuccessText(null);
        setTimeout(() => setErrorText(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-12">
        <h2 className="text-xl font-light text-[#fafafa] mb-8">Настройки</h2>
        
        <Card className="flex flex-col p-8 bg-[#111112] border border-white/5 rounded-2xl relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent ${isMonochrome ? 'via-white/20' : 'via-[#a3e635]/20'} to-transparent`} />
          
          <div className="text-sm font-bold uppercase tracking-widest text-[#717171] mb-6 text-center">Синхронизация по коду</div>

          {syncStatus === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className={`w-8 h-8 border-2 ${isMonochrome ? 'border-white' : 'border-[#a3e635]'} border-t-transparent rounded-full animate-spin`} />
              <div className="text-sm text-[#717171]">Запрос к серверу синхронизации...</div>
            </div>
          )}

          {syncStatus === 'idle' && (
            <div className="flex flex-col items-center text-center">
              <div className="text-4xl font-light text-[#fafafa] tracking-[0.2em] mb-2 font-mono select-all">
                {state.settings.syncCode || '------'}
              </div>
              <div className="text-xs text-[#717171] mb-8">
                {getCreatedAtString()}
              </div>

              {syncError && (
                <div className="w-full p-3 bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e] text-xs rounded-xl mb-6 text-left whitespace-pre-line leading-relaxed">
                  {syncError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                {state.settings.syncCode && state.settings.syncCode !== '------' && (
                  <Button 
                    variant="secondary" 
                    className="flex-1"
                    onClick={() => {
                      navigator.clipboard.writeText(state.settings.syncCode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? 'Скопировано!' : 'Копировать код'}
                  </Button>
                )}
                <Button variant="white" onClick={handleGenerateCode} className="flex-1">
                  Создать код
                </Button>
                <Button variant="secondary" onClick={() => { setSyncStatus('entering'); setSyncError(null); }} className="flex-1">
                  Загрузить данные
                </Button>
              </div>
            </div>
          )}

          {syncStatus === 'entering' && (
            <div className="flex flex-col items-center">
              <p className="text-xs text-[#717171] text-center mb-6 leading-relaxed">
                Введите 6-значный код синхронизации, сгенерированный на другом устройстве.
              </p>
              
              <input
                type="text"
                maxLength={7}
                placeholder="000 000"
                value={inputCode}
                onChange={(e) => {
                  let val = e.target.value.replace(/[^0-9]/g, '');
                  if (val.length > 6) val = val.slice(0, 6);
                  if (val.length > 3) {
                    setInputCode(val.slice(0, 3) + ' ' + val.slice(3));
                  } else {
                    setInputCode(val);
                  }
                }}
                className={`w-full max-w-[200px] text-center text-3xl font-mono tracking-widest bg-[#090909] border border-white/10 rounded-xl py-3 px-4 text-[#fafafa] ${isMonochrome ? 'focus:border-white/55' : 'focus:border-[#a3e635]'} focus:outline-none mb-6`}
              />

              {syncError && (
                <div className="w-full p-3 bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e] text-xs rounded-xl mb-6 text-left whitespace-pre-line leading-relaxed">
                  {syncError}
                </div>
              )}

              <div className="flex gap-3 w-full">
                <Button variant="secondary" onClick={() => setSyncStatus('idle')} className="flex-1">
                  Отмена
                </Button>
                <Button variant="white" onClick={handleFetchData} className="flex-1" disabled={inputCode.replace(/\s/g, '').length !== 6}>
                  Далее
                </Button>
              </div>
            </div>
          )}

          {syncStatus === 'confirming' && loadedData && (
            <div className="flex flex-col">
              <p className="text-xs text-center text-[#717171] mb-6 leading-relaxed">
                Данные успешно загружены! Пожалуйста, подтвердите замену текущих данных на этом устройстве.
              </p>

              <div className="bg-[#090909] border border-white/5 rounded-xl p-4 mb-6 space-y-2 font-mono text-xs text-[#717171]">
                <div className="flex justify-between">
                  <span>Выполненные сессии:</span>
                  <span className="text-[#fafafa] font-bold">{(loadedData.sessions || []).length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Пробные экзамены:</span>
                  <span className="text-[#fafafa] font-bold">{(loadedData.mockExams || []).length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Активные планы:</span>
                  <span className="text-[#fafafa] font-bold">{(loadedData.plans || []).length}</span>
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <Button variant="secondary" onClick={() => setSyncStatus('idle')} className="flex-1">
                  Отмена
                </Button>
                <Button variant="white" onClick={handleApplyData} className="flex-1">
                  Сохранить и применить
                </Button>
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <div className="text-[10px] text-[#717171] uppercase tracking-widest mb-4">Предметы</div>
          <div className="flex flex-wrap gap-3">
            {allSubjects.map(subj => {
              const isActive = state.settings.activeSubjects.includes(subj);
              return (
                <button
                  key={subj}
                  onClick={() => toggleSubject(subj)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border ${
                    isActive 
                      ? (isMonochrome ? 'bg-white/5 border-white/40 text-[#fafafa]' : 'bg-[#1c1c1c] border-[#a3e635]/50 text-[#fafafa]') 
                      : 'bg-[#1c1c1c] border-white/5 text-[#717171] hover:border-white/10 hover:text-[#fafafa]'
                  }`}
                >
                  {subj}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-[10px] text-[#717171] uppercase tracking-widest mb-4">Тема оформления</div>
          <div className="flex gap-3">
            <button
              onClick={() => updateSettings({ theme: 'green' })}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border flex-1 justify-center ${
                !isMonochrome
                  ? 'bg-white/5 border-white/30 text-[#fafafa]'
                  : 'bg-[#1c1c1c] border-white/5 text-[#717171] hover:border-white/10 hover:text-[#fafafa]'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-[#a3e635] shadow-[0_0_8px_rgba(163,230,53,0.5)]" />
              Лайм
            </button>
            <button
              onClick={() => updateSettings({ theme: 'monochrome' })}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border flex-1 justify-center ${
                isMonochrome
                  ? 'bg-white/5 border-white/40 text-[#fafafa]'
                  : 'bg-[#1c1c1c] border-white/5 text-[#717171] hover:border-white/10 hover:text-[#fafafa]'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
              Монохром
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-[10px] text-[#717171] uppercase tracking-widest mb-4">Формат таймера</div>
          <div className="flex gap-3">
            {[
              { id: 'default', label: 'По умолчанию' },
              { id: 'onlyMinutes', label: 'Только минуты' },
              { id: 'currentTime', label: 'Текущее время' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => updateSettings({ timerMode: t.id as TimerModeType })}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border flex-1 justify-center ${
                  state.settings.timerMode === t.id
                    ? (isMonochrome ? 'bg-white/5 border-white/40 text-[#fafafa]' : 'bg-[#a3e635]/10 border-[#a3e635]/50 text-[#a3e635]')
                    : 'bg-[#1c1c1c] border-white/5 text-[#717171] hover:border-white/10 hover:text-[#fafafa]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-[10px] text-[#717171] uppercase tracking-widest mb-4">Экран фокуса</div>
          
          <div className="space-y-2">
            {[
              { id: 'hideTimer', label: 'Скрыть таймер', icon: Clock },
              { id: 'hideErrorComments', label: 'Скрыть комментарии к ошибкам', icon: MessageSquareOff },
              { id: 'hideTaskMarkers', label: 'Скрыть маркеры заданий', icon: CheckSquare },
              { id: 'screenBurnProtection', label: 'Защита от выгорания', icon: Shield },
            ].map(setting => {
              const Icon = setting.icon;
              return (
                <div key={setting.id} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <Icon size={16} className="text-[#717171]" />
                    <span className="text-sm text-[#fafafa]">{setting.label}</span>
                  </div>
                  <Switch 
                    checked={(state.settings as any)[setting.id]} 
                    onChange={(c) => updateSettings({ [setting.id]: c })} 
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-[10px] text-[#717171] uppercase tracking-widest mb-4">Данные</div>
          <div className="flex flex-wrap gap-4">
            <Button variant="secondary" onClick={handleExport} className="text-sm flex items-center gap-2">
              <Download size={16} /> Экспортировать JSON
            </Button>
            <Button variant="secondary" onClick={handleImportClick} className="text-sm flex items-center gap-2">
              <Upload size={16} /> Импортировать
            </Button>
            <Button 
              variant="danger" 
              onClick={() => setShowResetModal(true)} 
              className="text-sm border-none bg-[#2a1414] text-[#f43f5e] hover:bg-[#3a1a1a] flex items-center gap-2"
            >
              <Trash2 size={16} /> Стереть все данные
            </Button>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />

          {successText && (
            <div className={`p-3 ${isMonochrome ? 'bg-white/5 border border-white/10 text-white' : 'bg-[#a3e635]/10 border border-[#a3e635]/30 text-[#a3e635]'} text-xs rounded-xl mt-2`}>
              {successText}
            </div>
          )}

          {errorText && (
            <div className="p-3 bg-[#f43f5e]/10 border border-[#f43f5e]/30 text-[#f43f5e] text-xs rounded-xl mt-2">
              {errorText}
            </div>
          )}
        </div>

        {/* Custom Reset Confirmation Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm p-6 bg-[#111112] border border-white/5 rounded-2xl shadow-2xl space-y-6">
              <h3 className="text-lg font-light text-[#fafafa]">Стереть все данные?</h3>
              <p className="text-sm text-[#717171] leading-relaxed">
                Вы уверены, что хотите удалить всю историю сессий, пробных экзаменов и настройки? Это действие необратимо.
              </p>
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="secondary" 
                  onClick={() => setShowResetModal(false)}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button 
                  variant="danger" 
                  onClick={() => {
                    resetData();
                    setShowResetModal(false);
                    setSuccessText('Все данные успешно стёрты.');
                    setTimeout(() => setSuccessText(null), 4000);
                  }}
                  className="flex-1 bg-[#f43f5e] hover:bg-[#e11d48] text-white border-none"
                >
                  Стереть
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

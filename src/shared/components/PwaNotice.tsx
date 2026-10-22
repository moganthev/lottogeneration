import { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export function PwaNotice() {
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
    null,
  );
  const [installHelp, setInstallHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  useEffect(() => {
    if (!installHelp) return;
    const trigger = triggerRef.current;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setInstallHelp(false);
      if (event.key !== 'Tab') return;
      const buttons =
        dialogRef.current?.querySelectorAll<HTMLButtonElement>('button');
      if (!buttons?.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      trigger?.focus();
    };
  }, [installHelp]);
  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } else setInstallHelp(true);
  }
  return (
    <>
      <button
        ref={triggerRef}
        className="install-button"
        onClick={() => void install()}
      >
        <Download size={15} /> 앱 설치
        <span className="desktop-only"> 안내</span>
      </button>
      {installHelp && (
        <div className="modal-backdrop" onClick={() => setInstallHelp(false)}>
          <section
            ref={dialogRef}
            className="install-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="앱 설치 안내"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button close-dialog"
              onClick={() => setInstallHelp(false)}
              aria-label="설치 안내 닫기"
              autoFocus
            >
              <X size={20} />
            </button>
            <h2>앱 설치 안내</h2>
            <p>
              iPhone Safari에서는 공유 버튼 → ‘홈 화면에 추가’를 선택하세요.
            </p>
            <p>
              Android·데스크톱 Chrome에서는 브라우저 메뉴 → ‘앱 설치’ 또는 ‘홈
              화면에 추가’를 선택하세요.
            </p>
            <p className="muted">
              한 번 접속해 데이터 저장이 끝나면 오프라인에서도 추천할 수
              있습니다.
            </p>
            <button
              className="primary-button"
              onClick={() => setInstallHelp(false)}
            >
              확인했어요
            </button>
          </section>
        </div>
      )}
      {needRefresh && !dismissed && (
        <div className="update-notice" role="status">
          <RefreshCw size={18} />
          <span>새 버전이 준비됐어요.</span>
          <button onClick={() => void updateServiceWorker(true)}>
            업데이트
          </button>
          <button
            className="icon-button"
            aria-label="업데이트 안내 닫기"
            onClick={() => {
              setDismissed(true);
              setNeedRefresh(false);
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}

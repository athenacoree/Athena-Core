import React, { useState } from 'react';
import { Github, Check, AlertCircle, Loader2 } from 'lucide-react';
import { usePushToGitHubMutation } from 'librechat-data-provider/react-query';
import PushToGitHubDialog from '~/components/Messages/Content/PushToGitHubDialog';
import { useLocalize } from '~/hooks';
import cn from '~/utils/cn';

interface PushToGitHubButtonProps {
  codeRef: React.RefObject<HTMLElement>;
  lang: string;
}

const PushToGitHubButton: React.FC<PushToGitHubButtonProps> = ({ codeRef, lang }) => {
  const localize = useLocalize();
  const pushMutation = usePushToGitHubMutation();
  const [status, setStatus] = useState<'idle' | 'pushing' | 'success' | 'error'>('idle');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleConfirm = async (path: string, message: string) => {
    if (!codeRef.current) {
      return;
    }

    const content = codeRef.current.innerText;
    setStatus('pushing');
    try {
      await pushMutation.mutateAsync({ path, content, message });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to push to GitHub:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handlePush = () => {
    if (status === 'pushing') {
      return;
    }
    setDialogOpen(true);
  };

  const getIcon = () => {
    switch (status) {
      case 'pushing':
        return <Loader2 size={18} className="animate-spin" />;
      case 'success':
        return <Check size={18} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={18} className="text-red-500" />;
      default:
        return <Github size={18} />;
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'pushing':
        return localize('com_ui_submitting');
      case 'success':
        return localize('com_ui_complete');
      case 'error':
        return localize('com_ui_error');
      default:
        return localize('com_nav_github_push');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePush}
        disabled={status === 'pushing'}
        className={cn(
          'inline-flex select-none items-center justify-center gap-2 rounded-md px-2 py-1 text-text-secondary transition-all duration-200 ease-out',
          'hover:bg-surface-hover hover:text-text-primary',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-heavy',
          status === 'pushing' && 'cursor-not-allowed opacity-50'
        )}
      >
        <span className="relative flex size-[18px] items-center justify-center" aria-hidden="true">
          {getIcon()}
        </span>
        <span className="relative overflow-hidden">
          {getLabel()}
        </span>
      </button>
      <PushToGitHubDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleConfirm}
        defaultPath={`code_block_${Date.now()}.${lang || 'txt'}`}
      />
    </>
  );
};

export default PushToGitHubButton;

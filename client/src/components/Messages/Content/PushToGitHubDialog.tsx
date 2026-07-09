import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogButton,
} from '~/components/ui';
import { Label, Input } from '~/components/ui';
import { useLocalize } from '~/hooks';

interface PushToGitHubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (path: string, message: string) => void;
  defaultPath: string;
}

const PushToGitHubDialog: React.FC<PushToGitHubDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  defaultPath,
}) => {
  const localize = useLocalize();
  const [path, setPath] = useState(defaultPath);
  const [message, setMessage] = useState('Add code block from LibreChat');

  const handleConfirm = () => {
    onConfirm(path, message);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{localize('com_nav_github_push')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 px-6">
          <div className="grid gap-2">
            <Label htmlFor="github-path">{localize('com_ui_path')}</Label>
            <Input
              id="github-path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="src/utils/code.js"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="github-message">{localize('com_endpoint_message')}</Label>
            <Input
              id="github-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Commit message"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogButton
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            {localize('com_ui_cancel')}
          </DialogButton>
          <DialogButton
            onClick={handleConfirm}
            variant="primary"
            disabled={!path.trim()}
          >
            {localize('com_ui_confirm')}
          </DialogButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PushToGitHubDialog;

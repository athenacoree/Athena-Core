import React from 'react';
import { useRecoilValue } from 'recoil';
import store from '~/store';
import { Dropdown, Label } from '~/components/ui';
import { useLocalize } from '~/hooks';

const GitHubSettings: React.FC = () => {
  const localize = useLocalize();
  const user = useRecoilValue(store.user);

  if (!user?.githubConnected) {
    return null;
  }

  const repoOptions = [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="github-repo">{localize('com_nav_github_repo')}</Label>
        <Dropdown
          id="github-repo"
          value={user?.githubActiveRepo || ''}
          onChange={() => {}}
          options={repoOptions}
          size="small"
        />
      </div>
    </div>
  );
};

export default GitHubSettings;

import React from 'react';
import { useRecoilState } from 'recoil';
import { useGetGitHubReposQuery, useSetGitHubActiveRepoMutation, useUserQuery } from 'librechat-data-provider/react-query';
import { Dropdown, Label, Switch } from '~/components/ui';
import { useLocalize } from '~/hooks';
import store from '~/store';

const GitHubSettings = () => {
  const localize = useLocalize();
  const { data: user } = useUserQuery();
  const { data: repos, isLoading } = useGetGitHubReposQuery({ enabled: !!user?.githubConnected });
  const setGitHubActiveRepo = useSetGitHubActiveRepoMutation();
  const [activeRepo, setActiveRepo] = useRecoilState(store.githubActiveRepo);
  const [showGitHubButton, setShowGitHubButton] = useRecoilState(store.showGitHubButton);

  const handleSelectRepo = (repoFullName: string) => {
    setActiveRepo(repoFullName);
    setGitHubActiveRepo.mutate(repoFullName);
  };

  if (!user?.githubConnected) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-text-secondary">
          {localize('com_nav_github_connect_desc')}
        </p>
        <a
          href={`${window.location.origin}/api/auth/github`}
          className="btn btn-primary w-fit"
        >
          {localize('com_nav_github_connect')}
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="show-github-button" className="text-sm font-medium">
          {localize('com_nav_github_show_button')}
        </Label>
        <Switch
          id="show-github-button"
          checked={showGitHubButton}
          onCheckedChange={setShowGitHubButton}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="github-repo-select">{localize('com_nav_github_active_repo')}</Label>
        <Dropdown
          id="github-repo-select"
          value={activeRepo || user?.githubActiveRepo || ''}
          onChange={handleSelectRepo}
          options={(repos || []).map((repo) => ({
            label: repo.full_name,
            value: repo.full_name,
          }))}
          placeholder={localize('com_nav_github_select_repo')}
          className="w-full"
          disabled={isLoading}
        />
      </div>
    </div>
  );
};

export default GitHubSettings;

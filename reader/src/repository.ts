import '../../app/repository.js';
import {t as uiText} from './i18n/messages.ts';
type RepositoryLinks = {repository:string;url:string;issues:string};
const config=(globalThis as typeof globalThis & {DPRRepository:{
 DEFAULT_REPOSITORY:string;REPO_URL:string;ISSUES_URL:string;links:(value?:string)=>RepositoryLinks;
}}).DPRRepository;
export const {DEFAULT_REPOSITORY,REPO_URL,ISSUES_URL,links:repositoryLinks}=config;

export function requireWritableBranch(repository:string, branch:string) {
  if (repository.toLowerCase() === DEFAULT_REPOSITORY.toLowerCase() && branch !== 'dev') {
    throw new Error(uiText("请在工作台设置中将任务分支设为 dev"));
  }
}

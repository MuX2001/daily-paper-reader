import '../../app/repository.js';
type RepositoryLinks = {repository:string;url:string;issues:string};
const config=(globalThis as typeof globalThis & {DPRRepository:{
 DEFAULT_REPOSITORY:string;REPO_URL:string;ISSUES_URL:string;links:(value?:string)=>RepositoryLinks;
}}).DPRRepository;
export const {DEFAULT_REPOSITORY,REPO_URL,ISSUES_URL,links:repositoryLinks}=config;

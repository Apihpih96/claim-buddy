import Resolver from '@forge/resolver';
import { runCheck, postVerdict } from './lib/atlassian';

const resolver = new Resolver();

resolver.define('check', async ({ context }) => {
  const issueKey = context?.extension?.issue?.key;
  if (!issueKey) return { error: 'Open this panel on a claim issue.' };
  try {
    return await runCheck(issueKey);
  } catch (e) {
    return { error: e.message };
  }
});

resolver.define('post', async ({ payload, context }) => {
  const issueKey = context?.extension?.issue?.key;
  try {
    const check = await runCheck(issueKey);
    return await postVerdict(issueKey, payload?.verdict || check.verdict, payload?.note, check);
  } catch (e) {
    return { error: e.message };
  }
});

export const handler = resolver.getDefinitions();

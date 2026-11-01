import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Box, Button, ButtonGroup, DynamicTable, Heading, Inline, Lozenge, SectionMessage, Spinner, Stack, Text } from '@forge/react';
import { invoke } from '@forge/bridge';

const APPEARANCE = {
  approve: 'success',
  'approve-with-notes': 'success',
  'approve-partial': 'moved',
  'needs-info': 'inprogress',
  reject: 'removed',
};

const money = (cur, n) => (n === null || n === undefined ? '—' : `${cur === 'MYR' ? 'RM' : cur + ' '}${Number(n).toFixed(2)}`);

const App = () => {
  const [data, setData] = useState(null);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(null);

  const load = () => {
    setData(null);
    invoke('check').then(setData).catch((e) => setData({ error: `Claim Buddy could not load: ${e?.message || e}` }));
  };
  useEffect(load, []);

  const post = async (verdict) => {
    setPosting(true);
    const r = await invoke('post', { verdict });
    setPosted(r);
    setPosting(false);
  };

  if (!data) return <Spinner label="Checking claim against policy" />;
  if (data.error) return <SectionMessage appearance="error"><Text>{data.error}</Text></SectionMessage>;

  const head = { cells: [{ key: 'c', content: 'Item' }, { key: 'd', content: 'Date' }, { key: 'a', content: 'Claimed' }, { key: 'r', content: 'Receipt' }, { key: 'ok', content: 'Allowed' }] };
  const rows = data.items.map((it, i) => ({
    key: `r${i}`,
    cells: [
      { key: 'c', content: it.category },
      { key: 'd', content: it.date || '—' },
      { key: 'a', content: money(data.currency, it.amount) },
      { key: 'r', content: it.receipt === true ? 'Yes' : it.receipt === false ? 'Missing' : data.attachments.length ? 'Attached' : 'None' },
      { key: 'ok', content: money(data.currency, it.allowed) },
    ],
  }));

  return (
    <Stack space="space.200">
      <Inline space="space.100" alignBlock="center">
        <Heading size="small">Recommendation</Heading>
        <Lozenge appearance={APPEARANCE[data.verdict] || 'default'} isBold>{data.verdictLabel}</Lozenge>
      </Inline>
      <Text>Claimed {money(data.currency, data.total)} · within policy {money(data.currency, data.allowed)}</Text>
      {data.items.length > 0 && <DynamicTable head={head} rows={rows} />}
      <Box>
        {data.reasons.map((r, i) => <Text key={i}>• {r}</Text>)}
      </Box>
      <Text>Policy: {data.policySource}{data.policyNote ? ` — ${data.policyNote}` : ''}</Text>
      {posted && !posted.error && <SectionMessage appearance="success"><Text>Posted to {posted.issueKey} and labelled {posted.label}.</Text></SectionMessage>}
      {posted && posted.error && <SectionMessage appearance="error"><Text>{posted.error}</Text></SectionMessage>}
      <ButtonGroup>
        <Button appearance="primary" isDisabled={posting} onClick={() => post(data.verdict)}>Post recommendation</Button>
        <Button isDisabled={posting} onClick={() => post('reject')}>Reject</Button>
        <Button appearance="subtle" onClick={load}>Re-check</Button>
      </ButtonGroup>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

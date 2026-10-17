import { useCallback, useEffect, useMemo, useState } from 'react';
import { App as AntApp, Button, ConfigProvider, Input, Modal, Select, Tag, theme } from 'antd';
import { WalletProvider, useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { WalletModalProvider, WalletActionButton } from '@tronweb3/tronwallet-adapter-react-ui';
import { BitKeepAdapter, OkxWalletAdapter, TokenPocketAdapter, TronLinkAdapter } from '@tronweb3/tronwallet-adapters';
import { TronWeb } from 'tronweb';

const MAINNET = 'https://api.trongrid.io';
const TRON_USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const tronWeb = new TronWeb({ fullHost: MAINNET });
type WatchedToken = { address: string; symbol: string; decimals: number };
type TokenRow = WatchedToken & { balance: string };

function parseUnits(value: string, decimals: number): bigint {
  if (!/^\d+(\.\d+)?$/.test(value.trim())) throw new Error('Enter a positive decimal amount.');
  const [whole, fraction = ''] = value.trim().split('.');
  if (fraction.length > decimals) throw new Error(`This token supports at most ${decimals} decimal places.`);
  const raw = BigInt(whole) * (10n ** BigInt(decimals)) + BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals) || '0');
  if (raw <= 0n) throw new Error('Amount must be greater than zero.');
  return raw;
}
function formatUnits(raw: bigint | string, decimals: number): string {
  const n = BigInt(raw);
  const base = 10n ** BigInt(decimals);
  const whole = n / base;
  const fraction = (n % base).toString().padStart(decimals, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
function short(address?: string) { return address ? `${address.slice(0, 7)}…${address.slice(-6)}` : 'Not connected'; }

function Studio() {
  const { message, notification } = AntApp.useApp();
  const { address, connected, connecting, connect, disconnect, signTransaction, wallet, select } = useWallet();
  const [trxBalance, setTrxBalance] = useState('Not loaded');
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [contract, setContract] = useState(TRON_USDT);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [tokenContract, setTokenContract] = useState(TRON_USDT);
  const [tokenRecipient, setTokenRecipient] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [customContract, setCustomContract] = useState('');
  const [status, setStatus] = useState('Connect a wallet to load live balances from TRON Mainnet.');
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const adapters = useMemo(() => [
    new TronLinkAdapter(),
    new OkxWalletAdapter(),
    new BitKeepAdapter(),
    new TokenPocketAdapter(),
  ], []);

  const loadBalances = useCallback(async () => {
    if (!address) { setTrxBalance('Not connected'); setTokens([]); return; }
    setBusy(true);
    try {
      const sun = await tronWeb.trx.getBalance(address);
      setTrxBalance((Number(sun) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 }));
      const saved = JSON.parse(localStorage.getItem('vexa-tron-token-watchlist-v1') || '[]') as WatchedToken[];
      const valid = saved.filter((x) => tronWeb.isAddress(x.address) && Number.isInteger(x.decimals) && x.decimals >= 0 && x.decimals <= 36);
      const rows: TokenRow[] = [];
      for (const item of valid.slice(0, 50)) {
        try {
          const c = await tronWeb.contract().at(item.address);
          const raw = await c.balanceOf(address).call();
          const symbol = String(await c.symbol().call()).slice(0, 32) || item.symbol || 'TOKEN';
          const decimals = Number(await c.decimals().call());
          if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) continue;
          rows.push({ address: item.address, symbol, decimals, balance: formatUnits(raw.toString(), decimals) });
        } catch { rows.push({ ...item, balance: 'Read failed' }); }
      }
      setTokens(rows);
      setStatus(`Read-only balance refresh completed from TRON Mainnet for ${short(address)}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  }, [address]);

  useEffect(() => { void loadBalances(); }, [loadBalances]);
  useEffect(() => { setTxHash(''); setRecipient(''); setTokenRecipient(''); }, [address]);

  const addToken = async () => {
    const value = customContract.trim();
    if (!tronWeb.isAddress(value)) { message.error('Enter a valid TRON contract address.'); return; }
    try {
      const c = await tronWeb.contract().at(value);
      const symbol = String(await c.symbol().call()).slice(0, 32);
      const decimals = Number(await c.decimals().call());
      if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error('Contract returned invalid decimals.');
      const previous = JSON.parse(localStorage.getItem('vexa-tron-token-watchlist-v1') || '[]') as WatchedToken[];
      if (previous.some((x) => x.address === value)) throw new Error('This contract is already on your watchlist.');
      if (previous.length >= 50) throw new Error('The local watchlist limit is 50 contracts.');
      localStorage.setItem('vexa-tron-token-watchlist-v1', JSON.stringify([...previous, { address: value, symbol, decimals }]));
      setCustomContract(''); setAddOpen(false); message.success(`${symbol} added to this browser's local watchlist.`);
      await loadBalances();
    } catch (error) { message.error(error instanceof Error ? error.message : String(error)); }
  };

  const sendTrx = async () => {
    if (!address || !connected) { message.error('Connect a wallet first.'); return; }
    if (!tronWeb.isAddress(recipient)) { message.error('Enter a valid TRON recipient address.'); return; }
    let sun: bigint;
    try { sun = parseUnits(amount, 6); } catch (error) { message.error(error instanceof Error ? error.message : String(error)); return; }
    Modal.confirm({
      title: 'Review TRX transfer',
      content: `Send ${amount} TRX to ${recipient}? Confirm the address and TRON Mainnet in your wallet before signing.`,
      okText: 'Continue to wallet',
      onOk: async () => {
        setBusy(true); setTxHash('');
        try {
          const tx = await tronWeb.transactionBuilder.sendTrx(recipient, Number(sun), address);
          const signed = await signTransaction(tx);
          const result = await tronWeb.trx.sendRawTransaction(signed);
          if (!result.result) throw new Error(result.message ? tronWeb.toUtf8(result.message) : 'The network rejected the transaction.');
          const id = String(result.txid || signed.txID || '');
          setTxHash(id); setStatus(`Broadcast accepted. Transaction confirmation is pending. TXID: ${id}`);
          notification.info({ message: 'Transaction broadcast', description: 'Check the transaction on TRONSCAN. A TXID alone is not proof of final settlement.' });
        } catch (error) { message.error(error instanceof Error ? error.message : String(error)); }
        finally { setBusy(false); }
      },
    });
  };

  const sendToken = async () => {
    if (!address || !connected) { message.error('Connect a wallet first.'); return; }
    if (!tronWeb.isAddress(tokenContract) || !tronWeb.isAddress(tokenRecipient)) { message.error('Enter valid token contract and recipient addresses.'); return; }
    setBusy(true); setTxHash('');
    try {
      const c = await tronWeb.contract().at(tokenContract);
      const decimals = Number(await c.decimals().call());
      if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error('Token contract returned invalid decimals.');
      const raw = parseUnits(tokenAmount, decimals);
      const currentContract = tokenContract;
      const currentAddress = address;
      const args = [{ type: 'address', value: tokenRecipient }, { type: 'uint256', value: raw.toString() }];
      const built = await tronWeb.transactionBuilder.triggerSmartContract(
        currentContract, 'transfer(address,uint256)', { feeLimit: 100_000_000, callValue: 0 }, args, currentAddress,
      );
      if (!built.result?.result || !built.transaction) throw new Error('Unable to build transfer transaction. Check contract and network.');
      const ok = await new Promise<boolean>((resolve) => Modal.confirm({
        title: 'Review TRC-20 transfer',
        content: `Send ${tokenAmount} tokens from contract ${currentContract} to ${tokenRecipient}? Check token, amount, recipient, and network in your wallet.`,
        okText: 'Continue to wallet', onOk: () => resolve(true), onCancel: () => resolve(false),
      }));
      if (!ok) return;
      if (currentAddress !== address || currentContract !== tokenContract) throw new Error('Wallet or token selection changed. Review the transfer again.');
      const signed = await signTransaction(built.transaction);
      const result = await tronWeb.trx.sendRawTransaction(signed);
      if (!result.result) throw new Error(result.message ? tronWeb.toUtf8(result.message) : 'The network rejected the transaction.');
      const id = String(result.txid || signed.txID || '');
      setTxHash(id); setStatus(`Broadcast accepted. Transaction confirmation is pending. TXID: ${id}`);
      notification.info({ message: 'Transaction broadcast', description: 'Check the transaction on TRONSCAN. A TXID alone is not proof of final settlement.' });
    } catch (error) { message.error(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };

  const removeToken = (tokenAddress: string) => {
    const saved = JSON.parse(localStorage.getItem('vexa-tron-token-watchlist-v1') || '[]') as WatchedToken[];
    localStorage.setItem('vexa-tron-token-watchlist-v1', JSON.stringify(saved.filter((x) => x.address !== tokenAddress)));
    void loadBalances();
  };

  return <div className="shell">
    <header className="topbar">
      <a className="brand" href="/token-studio"><span className="brand-mark">V</span><span><b>Vexa</b> TRON Studio<small>WALLET-CONNECTED WEB3</small></span></a>
      <div className="top-actions">
        <Select aria-label="Select wallet" className="wallet-select" placeholder="Choose wallet" value={wallet?.adapter.name} onChange={(v) => select(v)} options={adapters.map((a) => ({ label: a.name, value: a.name }))} />
        <WalletActionButton />
      </div>
    </header>
    <main>
      <section className="hero">
        <div><Tag color="green">TRON MAINNET READS</Tag><h1>Your assets.<br/><em>Your wallet.</em></h1><p>Live TRX and TRC-20 balances with wallet-approved transfers. Private keys stay inside your wallet.</p></div>
        <div className="hero-side"><span className="pulse"/><span>{connected ? 'Wallet connected' : connecting ? 'Connecting wallet…' : 'Wallet not connected'}</span><strong>{short(address)}</strong><small>RPC · api.trongrid.io</small></div>
      </section>
      <div className="notice"><b>Security checkpoint</b><span>Confirm TRON Mainnet, the destination address, token contract and amount in your wallet before approving. Never enter a seed phrase or private key here. Cross-chain bridge execution is disabled.</span></div>
      <section className="balance-grid">
        <article className="balance-card primary"><span>Native balance</span><strong>{trxBalance}<small> TRX</small></strong><p>Live account query · Mainnet</p><Button onClick={() => void loadBalances()} loading={busy} disabled={!address}>Refresh balances ↻</Button></article>
        <article className="balance-card"><span>Connected address</span><strong className="address-value">{short(address)}</strong><p>{address || 'Connect a wallet to begin'}</p>{address && <a href={`https://tronscan.org/#/address/${address}`} target="_blank" rel="noreferrer">Open on TRONSCAN ↗</a>}</article>
      </section>
      <section className="work-grid">
        <article className="panel"><div className="section-heading"><div><small>01 / NATIVE ASSET</small><h2>Send TRX</h2></div><span className="token-icon">T</span></div>
          <label>Recipient address</label><Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="T… recipient address" autoComplete="off"/>
          <label>Amount (TRX)</label><Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00"/>
          <Button type="primary" block disabled={!connected || busy} loading={busy} onClick={() => void sendTrx()}>Review and send TRX</Button>
        </article>
        <article className="panel"><div className="section-heading"><div><small>02 / SMART CONTRACT</small><h2>Send TRC-20</h2></div><span className="token-icon mint">◎</span></div>
          <label>Token contract</label><Input value={tokenContract} onChange={(e) => setTokenContract(e.target.value.trim())} placeholder="TRC-20 contract address"/>
          <label>Recipient address</label><Input value={tokenRecipient} onChange={(e) => setTokenRecipient(e.target.value.trim())} placeholder="T… recipient address" autoComplete="off"/>
          <label>Amount (uses contract decimals)</label><Input value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value)} inputMode="decimal" placeholder="0.00"/>
          <Button type="primary" block disabled={!connected || busy} loading={busy} onClick={() => void sendToken()}>Review and send token</Button>
        </article>
      </section>
      <section className="panel watchlist">
        <div className="section-heading"><div><small>03 / LOCAL PORTFOLIO</small><h2>Token watchlist</h2><p>Saved in this browser only. Not an automatic token discovery service.</p></div><Button onClick={() => setAddOpen(true)}>＋ Add contract</Button></div>
        <div className="token-table"><div className="table-head"><span>Asset / contract</span><span>Balance</span><span>Action</span></div>
          {tokens.length ? tokens.map((token) => <div className="table-row" key={token.address}><span><b>{token.symbol}</b><small>{short(token.address)}</small></span><strong>{token.balance}</strong><Button type="text" danger onClick={() => removeToken(token.address)}>Remove</Button></div>) : <div className="empty">{address ? 'No tokens saved yet. Add a verified TRC-20 contract to check its balance.' : 'Connect a wallet to view your saved token balances.'}</div>}
        </div>
      </section>
      <section className="panel bridge-panel"><div><small>04 / CROSS-CHAIN</small><h2>Bridge transfers</h2><p>Cross-chain execution is intentionally disabled here. Continue only on a supported provider, verify the route, token contracts, fees and destination before signing.</p></div><a className="external-link" href="https://meson.fi/" target="_blank" rel="noreferrer">Open official Meson ↗</a></section>
      <section className="status-panel"><div className="status-dot"/><div><b>Activity status</b><p>{status}</p>{txHash && <a href={`https://tronscan.org/#/transaction/${txHash}`} target="_blank" rel="noreferrer">Inspect transaction on TRONSCAN ↗</a>}</div></section>
      <footer><span>Vexa TRON Studio · TRON Mainnet</span><span><a href="/token-studio-legacy">Legacy Token Studio</a> · <a href="/demo-funds">Demo credits (simulation)</a> · <a href="/bridge-status">Bridge status helper</a></span><p>Never send funds to an address you have not verified. Transaction fees may be charged in TRX. Demo credits are not on-chain assets.</p></footer>
    </main>
    <Modal title="Add a TRC-20 contract" open={addOpen} onCancel={() => setAddOpen(false)} onOk={() => void addToken()} okText="Inspect and add">
      <p>Contract metadata is read from the configured TRON Mainnet RPC. Only add contracts you have independently verified.</p>
      <Input value={customContract} onChange={(e) => setCustomContract(e.target.value)} placeholder="TRC-20 contract address"/>
    </Modal>
  </div>;
}

export default function App() {
  const adapters = useMemo(() => [new TronLinkAdapter(), new OkxWalletAdapter(), new BitKeepAdapter(), new TokenPocketAdapter()], []);
  return <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#65e0c1', colorBgBase: '#08111f', borderRadius: 12, fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' } }}>
    <AntApp><WalletProvider adapters={adapters} autoConnect onError={(error) => console.error('Wallet adapter:', error)}><WalletModalProvider><Studio/></WalletModalProvider></WalletProvider></AntApp>
  </ConfigProvider>;
}

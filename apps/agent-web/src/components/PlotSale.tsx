import { useState } from 'react';
import { CalendarCheck, Receipt } from 'lucide-react';
import { Btn, Field, Panel, SectionTitle, SelectInput, TextInput } from '@bhairava/ui-web';
import { api } from '../api';
import { useRows, type Row } from '../lib/data';
import { errorMessage, formatPaise, text } from '../lib/format';
import { Notice } from './RecordList';

/** Fixed booking amounts the agent portal has always sent; the API persists them as given. */
const AGREEMENT_VALUE_PAISE = '200000000';
const ADVANCE_PAISE = '1000000';

const RESERVABLE = new Set(['AVAILABLE', 'RESERVED']);

export function usePlotSale(onChanged: () => void) {
  const [customerId, setCustomerId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key);
    setMsg('');
    setErr('');
    try {
      await action();
      setMsg(success);
      onChanged();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return {
    customerId,
    setCustomerId,
    busy,
    msg,
    err,
    canReserve: (plot: Row) => Boolean(customerId) && RESERVABLE.has(String(plot.status)),
    canBook: () => Boolean(customerId),
    reserve: (plot: Row) =>
      run(`reserve:${plot.id}`, () => api.reservations.create({ plotId: plot.id, customerId }), `Plot ${text(plot.number ?? plot.plotNumber)} reserved`),
    book: (plot: Row) =>
      run(
        `book:${plot.id}`,
        () =>
          api.bookings.create({
            plotId: plot.id,
            customerId,
            agreementValuePaise: AGREEMENT_VALUE_PAISE,
            advancePaise: ADVANCE_PAISE,
          }),
        `Plot ${text(plot.number ?? plot.plotNumber)} booked`,
      ),
  };
}

export type PlotSale = ReturnType<typeof usePlotSale>;

export function PlotSaleActions({ plot, sale }: { plot: Row; sale: PlotSale }) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Btn
        variant="tonal"
        className="min-h-9 px-3 text-xs"
        disabled={!sale.canReserve(plot) || sale.busy !== null}
        onClick={() => void sale.reserve(plot)}
      >
        <CalendarCheck className="h-3.5 w-3.5" />
        {sale.busy === `reserve:${plot.id}` ? 'Reserving…' : 'Reserve'}
      </Btn>
      <Btn
        variant="primary"
        className="min-h-9 px-3 text-xs"
        disabled={!sale.canBook() || sale.busy !== null}
        onClick={() => void sale.book(plot)}
      >
        <Receipt className="h-3.5 w-3.5" />
        {sale.busy === `book:${plot.id}` ? 'Booking…' : 'Book'}
      </Btn>
    </div>
  );
}

/** Customer the reserve / book actions apply to. Options come from the agent's scoped customer list. */
export function CustomerPicker({ sale }: { sale: PlotSale }) {
  const customers = useRows(() => api.customers.list());
  const options = [
    { value: '', label: customers.loading ? 'Loading customers…' : 'Pick one of your customers' },
    ...customers.rows
      .filter((c) => !c.redacted)
      .map((c) => ({ value: String(c.id), label: c.phone ? `${c.name} · ${c.phone}` : String(c.name) })),
  ];
  return (
    <Panel>
      <SectionTitle aside="Required for reserve and book">Customer</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your customers" hint={customers.err ? 'Customer list unavailable; enter an id instead.' : undefined}>
          <SelectInput value={sale.customerId} onChange={sale.setCustomerId} options={options} />
        </Field>
        <Field label="Customer id" hint={`Booking sends agreement ${formatPaise(AGREEMENT_VALUE_PAISE)} with advance ${formatPaise(ADVANCE_PAISE)}.`}>
          <TextInput
            value={sale.customerId}
            onChange={(v) => sale.setCustomerId(v.trim())}
            placeholder="cus_…"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
      </div>
      {sale.msg || sale.err ? (
        <div className="mt-4">
          {sale.msg ? <Notice tone="success">{sale.msg}</Notice> : null}
          {sale.err ? <Notice tone="error">{sale.err}</Notice> : null}
        </div>
      ) : null}
    </Panel>
  );
}

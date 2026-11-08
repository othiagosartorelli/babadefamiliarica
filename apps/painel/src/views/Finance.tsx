import { PageHeader } from "@/components/ui";

export function Finance() {
  return (
    <>
      <PageHeader title="Financeiro" description="Esta tela ganha números quando os primeiros pagamentos passarem pelo app." />
      <section className="card soft-card">
        <h2 className="section-title">O que vai aparecer aqui</h2>
        <ul className="plain-list">
          <li>Total pago pelas famílias no mês e quanto ficou com o app em taxas.</li>
          <li>Repasses às babás: o que já foi pago e o que está agendado depois do prazo de reclamação.</li>
          <li>Assinaturas premium das mães e cancelamentos com reembolso.</li>
          <li>Contratações em disputa, para você acompanhar.</li>
        </ul>
      </section>
      <section className="card">
        <h2 className="section-title">Taxas combinadas</h2>
        <ul className="plain-list">
          <li>Babá: 12% na primeira contratação com uma família e 8% nas recontratações.</li>
          <li>Família: 10% na primeira contratação, 8% nas recontratações e 5% para quem é premium.</li>
          <li>Pedido urgente: mais 5% para a família.</li>
        </ul>
        <p className="muted small">Ainda não há pagamentos reais, então nenhum valor é mostrado.</p>
      </section>
    </>
  );
}

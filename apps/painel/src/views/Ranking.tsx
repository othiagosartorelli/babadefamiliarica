import { GoldSeal, PageHeader } from "@/components/ui";

export function Ranking() {
  return (
    <>
      <PageHeader title="Ranking e prêmios" description="Esta tela ganha números quando as primeiras contratações forem concluídas no app." />
      <section className="card soft-card">
        <h2 className="section-title">O que vai aparecer aqui</h2>
        <ul className="plain-list">
          <li>As babás mais bem colocadas do mês, com nota, número de avaliações e taxa de recontratação.</li>
          <li>Os níveis de cada babá (Nova, Prata, Ouro e Elite), calculados sozinhos a partir das avaliações e da pontualidade.</li>
          <li>As candidatas aos prêmios do mês, para você escolher e anunciar.</li>
        </ul>
      </section>
      <section className="card">
        <h2 className="section-title">Como a pontuação é formada</h2>
        <p className="body-text">
          A nota das mães pesa mais (cuidado, pontualidade, comunicação, postura e apresentação). Também contam recontratações,
          resposta rápida, poucos cancelamentos e perfil completo. O selo <GoldSeal compact label="Babá de Família Rica" /> soma
          pontos de reconhecimento. Avaliações recentes valem mais que as antigas.
        </p>
        <p className="muted small">Ainda não há contratações concluídas, então nenhum ranking é mostrado.</p>
      </section>
    </>
  );
}

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Información legal',
  description: 'Aviso legal, términos, privacidad y cookies de KetoHoy.',
  robots: { index: false, follow: true },
}

const sectionClass = 'scroll-mt-6 border-t border-forest-800 pt-7'
const headingClass = 'text-xl font-semibold text-forest-50'
const paragraphClass = 'mt-3 text-sm leading-7 text-forest-200'

export default function LegalPage() {
  return (
    <main className="px-5 py-8 sm:py-12">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-forest-300 hover:text-forest-50">← Volver a KetoHoy</Link>
        <h1 className="mt-5 text-3xl font-semibold text-forest-50">Información legal</h1>
        <p className="mt-2 text-sm text-forest-300">Última actualización: 2 de octubre de 2026</p>
        <aside className="mt-5 rounded-xl border border-[#a3e635]/40 bg-forest-900 p-4 text-sm leading-6 text-forest-100">
          Borrador para revisión antes de publicar. La edad mínima de 18 años y el registro de aceptación de términos ya están implementados. Antes de publicar como versión definitiva hay que confirmar ubicación del hosting, contratos y transferencias de proveedores, retención de copias/logs y cookies/almacenamiento en producción.
        </aside>
        <nav aria-label="Documentos legales" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#a3e635]">
          <a href="#aviso-legal">Aviso legal</a>
          <a href="#terminos">Términos</a>
          <a href="#privacidad">Privacidad</a>
          <a href="#cookies">Cookies</a>
        </nav>

        <section id="aviso-legal" className={`${sectionClass} mt-8`}>
          <h2 className={headingClass}>Aviso legal</h2>
          <p className={paragraphClass}>En cumplimiento del artículo 10 de la Ley 34/2002 (LSSI-CE), se identifica al titular de KetoHoy:</p>
          <dl className="mt-4 grid gap-2 text-sm leading-6 text-forest-200 sm:grid-cols-[9rem_1fr]">
            <dt className="font-semibold text-forest-100">Titular</dt><dd>Sergio Andrés Ballesteros Chacón</dd>
            <dt className="font-semibold text-forest-100">NIF</dt><dd>Y9557203G</dd>
            <dt className="font-semibold text-forest-100">Domicilio</dt><dd>Calle Felipe III, 9, 28343 Valdemoro, Madrid, España</dd>
            <dt className="font-semibold text-forest-100">Contacto</dt><dd><a className="underline" href="mailto:soporte@ketohoy.es">soporte@ketohoy.es</a></dd>
          </dl>
          <p className={paragraphClass}>KetoHoy es una aplicación para organizar preferencias de alimentación, recetas, despensa y listas de compra.</p>
          <p className={paragraphClass}>Los contenidos de KetoHoy, incluidos textos, diseño, marca y software, están protegidos por la normativa aplicable. Los catálogos y marcas de terceros pertenecen a sus respectivos titulares.</p>
        </section>

        <section id="terminos" className={`${sectionClass} mt-8`}>
          <h2 className={headingClass}>Términos de uso</h2>
          <p className={paragraphClass}>KetoHoy está dirigido a personas de 18 años o más. Al crear una cuenta o continuar usando una cuenta, confirmas que tienes al menos 18 años y aceptas estos términos. Debes facilitar datos propios y mantener la seguridad de tus credenciales. Eres responsable de la actividad realizada desde tu cuenta y debes avisar a soporte si sospechas un acceso no autorizado.</p>
          <p className={paragraphClass}>KetoHoy ofrece actualmente, sin coste, herramientas para planificar comidas, guardar preferencias y organizar la despensa y la compra. El servicio puede cambiar o dejar de estar disponible por mantenimiento, seguridad o evolución del producto. Si se incorporan funciones de pago, se informarán sus condiciones antes de contratarlas.</p>
          <p className={paragraphClass}>Las recetas, estimaciones nutricionales, disponibilidad y precios son orientativos y pueden contener errores o cambiar. KetoHoy no presta asesoramiento médico ni nutricional y no sustituye a profesionales sanitarios. La persona usuaria debe comprobar ingredientes, alérgenos, etiquetado y seguridad alimentaria antes de consumir un producto o preparar una receta.</p>
          <p className={paragraphClass}>No está permitido utilizar el servicio de forma ilícita, intentar acceder a cuentas o sistemas ajenos, interferir en el servicio ni introducir contenido malicioso. Ante un incumplimiento o riesgo de seguridad, el titular podrá suspender temporalmente el acceso o cerrar la cuenta; cuando sea posible, informará del motivo y permitirá contactar con soporte para revisarlo. Se respetarán los derechos imperativos de las personas consumidoras.</p>
          <p className={paragraphClass}>Estos términos se rigen por la legislación española. Cuando la persona usuaria tenga la condición legal de consumidora, se respetarán los fueros y derechos imperativos que le correspondan.</p>
        </section>

        <section id="privacidad" className={`${sectionClass} mt-8`}>
          <h2 className={headingClass}>Política de privacidad</h2>
          <h3 className="mt-5 font-semibold text-forest-100">Responsable y contacto</h3>
          <p className={paragraphClass}>El responsable del tratamiento es Sergio Andrés Ballesteros Chacón, con domicilio en Calle Felipe III, 9, 28343 Valdemoro, Madrid, España. Para consultas o ejercer derechos: <a className="underline" href="mailto:soporte@ketohoy.es">soporte@ketohoy.es</a>.</p>

          <h3 className="mt-5 font-semibold text-forest-100">Datos, finalidades y bases</h3>
          <ul className={`${paragraphClass} list-disc space-y-2 pl-5`}>
            <li>Correo electrónico, contraseña protegida mediante hash o identificador de Google y estado de verificación, para crear y proteger la cuenta y prestar el servicio. Base: ejecución del servicio solicitado.</li>
            <li>Preferencias actuales (modo keto, exclusión de pescado, cerdo o lácteos y tiempo máximo de cocina), productos de despensa con cantidades/caducidades, listas de compra y planificación semanal, para prestar las funciones elegidas. Base: ejecución del servicio solicitado. La aplicación no pregunta por diagnósticos ni alergias; no introduzcas información médica en nombres de productos o mensajes a soporte. Si se añaden campos o usos que revelen salud, habrá que revisar su base jurídica antes de activarlos.</li>
            <li>Identificadores de sesión y datos técnicos necesarios para mantener la sesión y prevenir abuso o accesos no autorizados. Base: ejecución del servicio y, para seguridad, interés legítimo.</li>
            <li>Fecha de aceptación y versión de los términos, y fecha de confirmación de que tienes 18 años o más. Se usan para registrar la aceptación y aplicar el acceso al servicio; no guardamos tu fecha de nacimiento. Base: ejecución del servicio y, cuando proceda, interés legítimo para acreditar la aceptación.</li>
            <li>Mensajes que envíes a soporte, para responder a tu consulta. Base: atender la solicitud y, cuando proceda, interés legítimo.</li>
          </ul>
          <p className={paragraphClass}>El inicio de sesión con Google utiliza OpenID Connect con los permisos `openid` y `email`. KetoHoy recibe el identificador estable `sub`, que guarda como identificador de Google de la cuenta, y el correo electrónico con su estado de verificación. No solicita acceso a contactos, archivos ni otros datos de Google.</p>
          <p className={paragraphClass}>Los datos los facilita la persona usuaria o, si elige Google Login, se reciben de Google durante la autenticación. El correo es necesario para crear una cuenta; sin él no es posible prestar las funciones asociadas. Las preferencias de alimentación son opcionales. KetoHoy no realiza decisiones automatizadas con efectos jurídicos o significativamente similares.</p>

          <h3 className="mt-5 font-semibold text-forest-100">Proveedores y destinatarios</h3>
          <p className={paragraphClass}>OVHcloud aloja la aplicación en un VPS cuya ficha de OVH indica Gravelines (GRA), Francia, y presta el buzón de soporte en un servicio MX Plan separado; la ubicación y el contrato aplicables al buzón aún deben confirmarse por separado. Resend envía los mensajes de verificación y restablecimiento; Google interviene si eliges Google Login. Las consultas de catálogo a Mercadona y Open Food Facts se realizan desde el servidor e incluyen los términos o identificadores de producto necesarios, no el correo ni el identificador de cuenta. Cada proveedor solo debe recibir los datos necesarios para su función. Cuando actúe como encargado del tratamiento, la relación debe regirse por un contrato conforme al artículo 28 del RGPD; Google y los servicios de catálogo pueden tener roles distintos según el flujo concreto.</p>
          <p className={paragraphClass}>El dominio de envío de Resend aparece configurado en Irlanda (eu-west-1); esa región identifica el envío. El DPA de Resend que tenemos, actualizado el 31 de diciembre de 2025, indica en su sección 6.1 que sus operaciones principales de tratamiento tienen lugar en Estados Unidos. Para transferencias desde el EEE incorpora las cláusulas contractuales tipo de la UE y los módulos que correspondan según el rol. El anexo A incluye metadatos, direcciones de correo y contenido de los mensajes; el DPA indica que no se transfieren categorías sensibles. Su sección 4.2 prevé avisar con 14 días de antelación de cambios en subencargados. Antes de publicar como definitiva hay que comprobar la lista vigente de subencargados y que este DPA corresponde a la cuenta y al servicio contratados.</p>

          <h3 className="mt-5 font-semibold text-forest-100">Conservación</h3>
          <p className={paragraphClass}>Los datos de la cuenta y su contenido se conservan mientras la cuenta esté activa. Actualmente no hay una opción para borrar la cuenta desde la aplicación: puedes solicitarlo en <a className="underline" href="mailto:soporte@ketohoy.es">soporte@ketohoy.es</a>. Se conservarán los datos que deban mantenerse por obligación legal o para atender responsabilidades. Las sesiones caducan como máximo a los 30 días; los enlaces de verificación caducan a las 24 horas y los de restablecimiento de contraseña a 1 hora. El DPA de Resend prevé tratar los datos mientras el acuerdo esté activo y borrarlos dentro de los 90 días siguientes a su terminación. Resend publica además 30 días de retención para emails y logs en los planes Free, Pro y Scale; falta confirmar el plan de esta cuenta. La app conserva hasta 10 copias de la base de datos, una por despliegue, en el VPS; el plazo varía según la frecuencia de despliegues. La rotación/eliminación de logs del VPS y el borrado de las copias tras cerrar una cuenta deben verificarse.</p>

          <h3 className="mt-5 font-semibold text-forest-100">Derechos</h3>
          <p className={paragraphClass}>Puedes solicitar acceso, rectificación, supresión, oposición, limitación y portabilidad, así como retirar cualquier consentimiento cuando el tratamiento se base en él, escribiendo a <a className="underline" href="mailto:soporte@ketohoy.es">soporte@ketohoy.es</a> e indicando cómo localizar tu cuenta. También puedes reclamar ante la <a className="underline" href="https://www.aepd.es/" rel="noreferrer">Agencia Española de Protección de Datos</a>. Si no puedes verificar tu identidad por correo, se te podrá solicitar información adicional proporcionada.</p>
        </section>

        <section id="cookies" className={`${sectionClass} mt-8`}>
          <h2 className={headingClass}>Cookies técnicas y almacenamiento local</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left text-sm text-forest-200">
              <thead><tr className="border-b border-forest-700 text-forest-100"><th className="py-2 pr-4">Elemento</th><th className="py-2 pr-4">Finalidad</th><th className="py-2">Duración</th></tr></thead>
              <tbody>
                <tr className="border-b border-forest-800"><td className="py-2 pr-4"><code>session</code></td><td className="py-2 pr-4">Mantener la sesión iniciada</td><td className="py-2">Hasta 30 días</td></tr>
                <tr className="border-b border-forest-800"><td className="py-2 pr-4"><code>google_oauth</code></td><td className="py-2 pr-4">Proteger el flujo de acceso con Google</td><td className="py-2">10 minutos</td></tr>
                <tr><td className="py-2 pr-4"><code>localStorage</code> (favoritos)</td><td className="py-2 pr-4">Guardar favoritos en ese dispositivo</td><td className="py-2">Hasta que se borre en el navegador</td></tr>
              </tbody>
            </table>
          </div>
          <p className={paragraphClass}><code>localStorage</code> es almacenamiento del navegador, no una cookie, y los favoritos no se sincronizan con el servidor. En el código actual no se han detectado cookies de publicidad ni herramientas de analítica de terceros; hay que volver a comprobarlo en producción antes de publicar esta información.</p>
          <p className={paragraphClass}>Puedes borrar cookies y almacenamiento local desde los ajustes del navegador. Si borras la cookie de sesión, tendrás que iniciar sesión de nuevo; si borras los datos locales, desaparecerán los favoritos guardados en ese dispositivo.</p>
        </section>

        <footer className="mt-8 border-t border-forest-800 pt-5 text-sm text-forest-300">
          Dudas: <a className="underline" href="mailto:soporte@ketohoy.es">soporte@ketohoy.es</a>
        </footer>
      </article>
    </main>
  )
}

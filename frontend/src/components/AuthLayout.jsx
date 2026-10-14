import { FileText, ArrowLeftRight, ChartNoAxesCombined } from 'lucide-react';
import brecoLogo from '../assets/Brecos-logo-finale.png';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-layout">
      <section className="auth-intro" aria-label="Brecos System">
        <div className="auth-brand"><img src={brecoLogo} alt="Brecos" /><span>BUSINESS RECORDS SYSTEM</span></div>
        <div className="auth-message">
          <p className="auth-eyebrow">YOUR BUSINESS, ORGANIZED</p>
          <h2>A clearer view of<br />your everyday business.</h2>
          <p>Keep your bills, payments, and cash records together in one simple workspace.</p>
          <div className="auth-features">
            <div><FileText size={19} /><span>Bill & payment tracking</span></div>
            <div><ArrowLeftRight size={19} /><span>Cash in & cash out records</span></div>
            <div><ChartNoAxesCombined size={19} /><span>Business insights at a glance</span></div>
          </div>
        </div>
        <p className="auth-intro-footer">Brecos System · Built for your daily workflow</p>
      </section>
      <section className="auth-form-area">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><img src={brecoLogo} alt="Brecos" /></div>
          <div className="auth-heading"><p className="auth-eyebrow">WELCOME TO BRECOS</p><h1>{title}</h1><p>{subtitle}</p></div>
          {children}
          <p className="auth-copyright">© {new Date().getFullYear()} Brecos System. All rights reserved.</p>
        </div>
      </section>
    </div>
  );
}

import { Component } from 'react';

export default class RouteErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="min-h-[70dvh] flex flex-col items-center justify-center gap-5 px-6 py-32 text-center text-white">
        <h1 className="text-2xl font-bold">No pudimos abrir este apartado</h1>
        <p className="max-w-md text-[#aaa]">Revisa tu conexión y vuelve a cargar la página. Los cambios sin guardar deberán intentarse de nuevo.</p>
        <button onClick={() => window.location.reload()} className="rounded-xl bg-[#F47A20] px-6 py-3 font-bold text-black cursor-pointer">Volver a cargar</button>
      </div>
    );
  }
}

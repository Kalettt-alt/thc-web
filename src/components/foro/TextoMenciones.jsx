export default function TextoMenciones({ texto }) {
  if (!texto) return null;
  return texto.split(/(@[\w!.]+)/g).map((parte, index) => parte.startsWith('@')
    ? <span key={index} className="text-[#F47A20] font-bold bg-[#F47A20]/10 px-1 rounded">{parte}</span>
    : <span key={index}>{parte}</span>);
}

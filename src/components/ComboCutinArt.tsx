import type { ComboCutinId } from '../data/ultCutins';

/** Code-native pixel emblems; the cut-in keeps the game's existing character art. */
export default function ComboCutinArt({ id, className = '' }: { id: ComboCutinId; className?: string }) {
  return <svg viewBox="0 0 160 160" className={`combo-cutin-art ${className}`} shapeRendering="crispEdges" aria-hidden="true">
    {id === 'skydragon' && <>
      <path d="M118 8h30v30h-8v12h-12v12h-12v12h-12v12H92v12H80v12H64v-8H52V86h12V74h12V62h12V50h12V38h12V22h6z" fill="#13243e" />
      <path d="M122 16h18v18h-8v12h-12v12h-12v12H96v12H84v12H72v8H60V90h12V78h12V66h12V54h12V42h12z" fill="#8ddce8" />
      <path d="M128 20h8v10h-8v12h-12v12h-12v12H92v12H80v12H68v-8h12V70h12V58h12V46h12V34h12z" fill="#e9ffed" />
      <path d="M38 86h12v12h12v12h12v12H62v-8H50l-24 28H12v-14l28-24V94H28V82h10z" fill="#f5cb79" />
      <path d="M20 130h8v-8h8v-8h8v8h-8v8h-8v8h-8z" fill="#fff0c1" />
      <path d="M28 28h32v8h12v12H56V38H36v8H24v26h12v12H24V74H14V42h14z M100 100h12v14h20v-12h10v22h-14v10h-28v-8H86v-12h14z" fill="#74c7ba" />
      <path d="M40 22h8v8h-8z M26 28h8v8h-8z M124 112h8v8h-8z" fill="#ffdc91" />
    </>}
    {id === 'doublewing' && <>
      <path d="M8 18h16v14h16v14h16v14h16v24h16V60h16V46h16V32h16V18h16v50h-12v20h-16v16h-16v16H94v16H66v-16H52v-16H36V88H20V68H8z" fill="#536aaf" />
      <path d="M14 26h8v16h16v16h16v16h16v24H58V84H42V70H28V56H14z M146 26h-8v16h-16v16h-16v16H90v24h12V84h16V70h14V56h14z" fill="#d9f5ff" />
      <path d="M22 70h12v16h16v16h16v16h-8v-8H42V96H28V82h-6z M138 70h-12v16h-16v16H94v16h8v-8h16V96h14V82h6z" fill="#a1c8f3" />
      <path d="M74 80h12v16h12v12H86v20H74v-20H62V96h12z" fill="#fff0bc" />
      <path d="M50 18h6v8h8v6h-8v8h-6v-8h-8v-6h8z M104 10h6v8h8v6h-8v8h-6v-8h-8v-6h8z" fill="#e4e3ff" />
    </>}
    {id === 'vajra' && <>
      {[12,61,110].map((x,i) => <g key={x} transform={`translate(${x},${i===1?14:38})`}>
        <path d="M4 0h28v8h6v62h-8v12H8V70H0V8h4z" fill="#aa7b48" />
        <path d="M8 6h20v10h6v46h-8v12H12V62H4V16h4z" fill="#ffe0a0" />
        <path d="M8 20h22v20H8z" fill="#243b56" />
        <path d="M10 26h6v6h-6z M22 26h6v6h-6z" fill="#a9ecdf" />
        <path d="M12 44h14v8h6v12H6V52h6z" fill="#dfaf63" />
        <path d="M16 4h6v16h-6z M12 54h14v6H12z" fill="#fff4d0" />
      </g>)}
      <path d="M8 130h144v8h-12v8H20v-8H8z" fill="#cf9b50" />
      <path d="M24 132h112v4H24z M78 116h4v12h-4z" fill="#fff2bd" />
    </>}
    {id === 'allbomb' && <>
      {[[50,8],[10,77],[95,84]].map(([x,y],i) => <g key={x} transform={`translate(${x},${y})`}>
        <path d="M16 0h24v8h12v12h8v22h-8v12H40v8H16v-8H4V42h-6V20h6V8h12z" fill={i===0?'#b85557':'#cf7454'} />
        <path d="M18 8h20v8h10v10h6v14h-8v10H36v6H18v-8H8V38H2V24h8V14h8z" fill={i===0?'#ffd68f':'#ffa873'} />
        <path d="M24 16h10v10h10v10H34v12H24V36H14V26h10z" fill="#fff2cd" />
      </g>)}
      <path d="M20 24h8v16h8v12h-8V42h-8z M134 24h8v20h-8v12h-8V42h8z M76 98h8v12h8v12h-8v16h-8v-20h-8v-12h8z" fill="#f9d69d" />
    </>}
    {id === 'heartpoison' && <>
      <path d="M18 46h28v12h14V44h24v8h28V40h26v12h12v30h-12v14h-24v12H88V96H68v16H40v-8H18V90H8V58h10z" fill="#637957" />
      <path d="M22 66h24v12h16v-8h20v12h26V66h26v10h10v12h-16v12h-24v10H84V98H62v10H38V94H20z" fill="#a9d496" />
      <path d="M44 26h24v12h24V26h24v12h12v34h-12v14h-14v14H90v14H70v-14H58V86H44V72H32V38h12z" fill="#8c5c94" />
      <path d="M48 34h16v14h32V34h16v10h8v24h-12v14H96v12H84v12h-8V94H64V82H52V68H40V44h8z" fill="#d4a0c4" />
      <path d="M48 44h12v10H48z M48 120h12v12H48z M94 134h10v10H94z M26 18h8v8h-8z M130 120h10v10h-10z" fill="#e4f7c2" />
    </>}
  </svg>;
}


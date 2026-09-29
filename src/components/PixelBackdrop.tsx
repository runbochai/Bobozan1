export default function PixelBackdrop({ scene }: { scene: 'title' | 'home' | 'lobby' | 'battle' }) {
  return <div className={`pixel-backdrop pixel-scene-${scene}`} aria-hidden="true">
    <svg viewBox="0 0 480 270" preserveAspectRatio="xMidYMid slice" shapeRendering="crispEdges">
      <rect width="480" height="270" className="pixel-sky" />
      <g className="pixel-stars" fill="#d7efea">{Array.from({ length: 35 }, (_, i) => <rect key={i} x={(i * 79 + 13) % 480} y={(i * 31 + 9) % 132} width={i % 5 === 0 ? 2 : 1} height={i % 5 === 0 ? 2 : 1} />)}</g>
      <g className="pixel-moon"><path d="M367 24h25v4h5v5h4v22h-4v5h-5v4h-25v-4h-5v-5h-4V33h4v-5h5z" fill="#ffe6a6"/><path d="M367 31h7v5h-7zM384 49h9v6h-9zM363 45h4v8h-4z" fill="#e0bd80"/></g>
      <g className="pixel-clouds" fill="#8da3b6" opacity=".22"><path d="M15 57h14v-6h22v6h17v5h17v6H6v-6h9zM231 30h14v-5h27v5h19v5h11v6h-82v-6h11zM413 90h15v-6h25v6h21v6h15v6h-90v-6h14z"/></g>
      <path d="M0 164v-13h22v-14h18v-16h20v-15h19v-13h20v15h13v15h18v14h21v-9h20v-20h20V92h21V75h24v18h18v15h17v18h23v15h30v-21h18v-19h18V81h18V65h19v19h18v20h21v20h20v20h25v20z" fill="#303b61"/>
      <path d="M0 178v-18h33v-14h28v-16h24v15h20v18h28v-9h27v-21h22v-19h21v18h24v21h25v10h30v-16h25v-20h20v-14h22v21h25v19h29v14h28v-8h27v19z" fill="#334d68"/>
      <g className="pixel-castle"><path d="M324 171V96h8v-9h8v9h9v-9h8v9h8v75zM380 171v-65h8v-9h8v9h9v-9h8v9h8v65zM352 171v-44h33v44z" fill="#141e35"/><path d="M336 117h7v11h-7zM393 123h7v10h-7zM362 149h10v22h-10z" fill="#e9ad60"/><path d="M345 87V63h2v24z" fill="#121b30"/><path d="M347 64h20v6h-6v5h-14z" fill="#d17365"/></g>
      <path d="M0 191v-12h20v-14h12v-16h8v16h12v14h20v-8h18v-20h10v-18h8v18h12v20h18v19h43v-16h12v-20h8v20h12v17h76v-17h12v-23h8v23h12v18h62v-15h12v-20h8v20h12v15h26v-12h12v-18h8v18h12v12h19v27H0z" fill="#172e3b"/>
      <path d="M0 199h480v71H0z" fill="#11242c"/><path d="M0 199h480v4H0z" fill="#5e8c72"/>
      <path d="M215 203h50v12h16v14h23v15h29v26H145v-26h31v-15h22v-14h17z" fill="#34434b"/>
      <g fill="#57616a"><path d="M223 207h20v3h-20zM251 220h16v3h-16zM204 236h31v4h-31zM262 248h38v4h-38zM183 263h39v4h-39z"/></g>
      <g fill="#274b43">{Array.from({ length: 24 }, (_, i) => <path key={i} d={`M${(i * 67) % 480} ${214 + i % 4 * 12}h8v3h-8z`} />)}</g>
      <g className="pixel-fireflies" fill="#f8ce78">{Array.from({ length: 9 }, (_, i) => <rect key={i} x={(i * 57 + 29) % 480} y={169 + i % 4 * 13} width="2" height="2" />)}</g>
    </svg>
    <div className="pixel-scene-shade" />
  </div>;
}

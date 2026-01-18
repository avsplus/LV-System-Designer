import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SymbolRenderer from "./SymbolRenderer";

const SYMBOL_NAMES = {
  'ELEC-1G': '1-Gang Outlet',
  'ELEC-2G': '2-Gang Outlet',
  'ELEC-4G': '4-Gang Outlet',
  'AV-AVO': 'AV Outlet',
  'NET-DP': 'Data & Phone',
  'NET-DO': 'Data Outlet',
  'NET-PO': 'Phone Outlet',
  'AV-SPK': 'Speaker',
  'NET-WAP': 'Wireless Access Point',
  'AV-PS': 'Projector Screen',
  'AV-TV': 'Television',
  'CTRL-KP': 'Keypad',
  'CTRL-WTP': 'Wall Touch Panel',
  'CTRL-TTP': 'Tabletop Touch Panel',
  'CTRL-VC': 'Volume Control'
};

export default function SymbolLegend({ annotations = [], floorplans = [], floorplanId = null }) {
  // Get unique symbols from annotations for this specific floorplan
  const uniqueSymbols = React.useMemo(() => {
    const symbolMap = new Map();
    annotations.forEach(ann => {
      if (ann.type === 'symbol' && ann.symbolId && ann.floorplanId === floorplanId) {
        if (!symbolMap.has(ann.symbolId)) {
          symbolMap.set(ann.symbolId, {
            id: ann.symbolId,
            name: SYMBOL_NAMES[ann.symbolId] || ann.symbolId,
            color: ann.color || '#3b82f6'
          });
        }
      }
    });
    return Array.from(symbolMap.values());
  }, [annotations, floorplanId]);

  if (uniqueSymbols.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gray-900/90 backdrop-blur-sm border-gray-700 shadow-xl min-w-[280px]">
      <CardHeader className="pb-5">
        <CardTitle className="text-white text-xl font-bold">Symbol Legend</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {uniqueSymbols.map(symbol => (
          <div key={symbol.id} className="flex items-center gap-5 py-2">
            <div className="flex-shrink-0">
              <svg width="70" height="70" viewBox="-30 -30 60 60">
                <SymbolRenderer
                  symbolId={symbol.id}
                  position={{ x: 0, y: 0 }}
                  color={symbol.color}
                  scale={0.8}
                  rotation={0}
                  flipped={false}
                />
              </svg>
            </div>
            <span className="text-gray-100 text-lg font-semibold">{symbol.name}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
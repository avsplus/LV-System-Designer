import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const categorySolidColors = {
  televisions: "bg-blue-600",
  projectors: "bg-purple-600",
  projector_screens: "bg-fuchsia-600",
  video_distribution: "bg-cyan-500",
  matrix_switchers: "bg-teal-600",
  audio_streamers: "bg-pink-500",
  media_streamers: "bg-rose-600",
  speakers: "bg-green-600",
  soundbars: "bg-lime-500",
  subwoofers: "bg-red-600",
  stereo_amps: "bg-orange-600",
  multizone_amps: "bg-amber-600",
  surround_processors: "bg-yellow-400",
  av_receivers: "bg-emerald-600"
};

export default function ProductDetailsPanel({ product, onClose }) {
  if (!product) return null;

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Product Details</h2>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-6 h-6 rounded-md ${categorySolidColors[product.category]}`}></div>
            <span className="text-sm text-gray-300 capitalize">{product.category.replace(/_/g, ' ')}</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-1">{product.brand}</h3>
          <p className="text-base text-gray-300">{product.model}</p>
        </div>

        {product.price && (
          <div>
            <p className="text-sm text-gray-500 mb-1">Price</p>
            <p className="text-lg font-semibold text-blue-400">
              ${product.price.toLocaleString()}
            </p>
          </div>
        )}

        {product.description && (
          <div>
            <p className="text-sm text-gray-500 mb-2">Description</p>
            <p className="text-sm text-gray-300 leading-relaxed">
              {product.description}
            </p>
          </div>
        )}

        {product.control && (product.control.ip || product.control.rs232 || product.control.ir || product.control.trigger || (product.control.protocols && product.control.protocols.length > 0)) && (
          <div>
            <p className="text-sm text-gray-500 mb-2">Control Capabilities</p>
            <div className="flex flex-wrap gap-2">
              {product.control.ip && (
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                  IP Control
                </Badge>
              )}
              {product.control.rs232 && (
                <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">
                  RS232
                </Badge>
              )}
              {product.control.ir && (
                <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                  IR
                </Badge>
              )}
              {product.control.trigger && (
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                  12V Trigger
                </Badge>
              )}
              {product.control.protocols && product.control.protocols.map((protocol, idx) => (
                <Badge key={idx} variant="outline" className="text-xs border-gray-600">
                  {protocol}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {product.specs && Object.keys(product.specs).length > 0 && (
          <div>
            <p className="text-sm text-gray-500 mb-3">Specifications</p>
            <div className="space-y-2">
              {Object.entries(product.specs).map(([key, value]) => 
                value ? (
                  <div key={key} className="flex justify-between items-start py-2 border-b border-gray-800">
                    <span className="text-xs text-gray-400 capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-200 text-right ml-2">
                      {value}
                    </span>
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}

        {product.image_url && (
          <div>
            <p className="text-sm text-gray-500 mb-2">Image</p>
            <img 
              src={product.image_url} 
              alt={`${product.brand} ${product.model}`}
              className="w-full rounded-lg border border-gray-700"
            />
          </div>
        )}
      </div>
    </div>
  );
}
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const categoryColors = {
  speakers: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  amplifiers: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  receivers: "bg-green-500/10 text-green-400 border-green-500/20",
  subwoofers: "bg-red-500/10 text-red-400 border-red-500/20",
  turntables: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  dacs: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  streamers: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  headphones: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  processors: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  cables: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  microphones: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  mixers: "bg-teal-500/10 text-teal-400 border-teal-500/20"
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
          <Badge className={`${categoryColors[product.category]} border mb-3`}>
            {product.category}
          </Badge>
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
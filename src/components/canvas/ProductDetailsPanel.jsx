import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const categorySolidColors = {
  televisions: "bg-blue-500",
  projectors: "bg-purple-500",
  projector_screens: "bg-indigo-500",
  video_distribution: "bg-cyan-500",
  matrix_switchers: "bg-teal-500",
  audio_streamers: "bg-pink-500",
  media_streamers: "bg-rose-500",
  speakers: "bg-green-500",
  soundbars: "bg-lime-500",
  subwoofers: "bg-red-500",
  stereo_amps: "bg-orange-500",
  multizone_amps: "bg-amber-500",
  surround_processors: "bg-yellow-500",
  av_receivers: "bg-emerald-500"
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
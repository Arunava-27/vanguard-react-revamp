import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux"; // <-- ADD this
import { selectFlows } from "../redux/slices/flowsSlice";
import { ForceGraph2D } from "react-force-graph";
import { useNavigate } from "react-router-dom";

const NetworkMap = () => {
  const flows = useSelector(selectFlows); // <-- UPDATE this line
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    protocol: "all",
    minTraffic: 0,
    timeWindow: "all",
  });

  const navigate = useNavigate();
  const graphRef = useRef();

  useEffect(() => {
    if (flows.length > 0) {
      const filteredFlows = flows.filter((flow) => {
        // Filter by protocol
        if (
          filterOptions.protocol !== "all" &&
          flow.protocol !== parseInt(filterOptions.protocol)
        ) {
          return false;
        }

        // Filter by minimum traffic
        if (flow.total_bytes < filterOptions.minTraffic) {
          return false;
        }

        // Filter by time window
        if (filterOptions.timeWindow !== "all") {
          const now = Date.now();
          const flowTime = flow.timestamp * 1000;
          const timeWindowMs = parseInt(filterOptions.timeWindow) * 60 * 1000;
          if (now - flowTime > timeWindowMs) {
            return false;
          }
        }

        return true;
      });

      // Build nodes and links from filtered flows
      const nodes = new Map();
      const links = [];

      filteredFlows.forEach((flow) => {
        // Add source node if not exists
        if (!nodes.has(flow.src_ip)) {
          nodes.set(flow.src_ip, {
            id: flow.src_ip,
            name: flow.src_ip,
            val: 1, // Node size
            group: "source",
            flows: [],
          });
        } else {
          // Increment node value for sizing
          const node = nodes.get(flow.src_ip);
          node.val += 1;
        }

        // Add destination node if not exists
        if (!nodes.has(flow.dst_ip)) {
          nodes.set(flow.dst_ip, {
            id: flow.dst_ip,
            name: flow.dst_ip,
            val: 1,
            group: "destination",
            flows: [],
          });
        } else {
          const node = nodes.get(flow.dst_ip);
          node.val += 1;
        }

        // Store flow info in both nodes
        nodes.get(flow.src_ip).flows.push(flow);
        nodes.get(flow.dst_ip).flows.push(flow);

        // Add link
        links.push({
          source: flow.src_ip,
          target: flow.dst_ip,
          value: flow.total_bytes,
          protocol: flow.protocol,
          port: flow.dst_port,
          flowInfo: flow,
        });
      });

      setGraphData({
        nodes: Array.from(nodes.values()),
        links,
      });
    }
  }, [flows, filterOptions]);

  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };

  const handleLinkClick = (link) => {
    // Navigate to flow detail when clicking on a link
    navigate(`/flow/${link.flowInfo.timestamp}`, {
      state: { flow: link.flowInfo },
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterOptions((prev) => ({
      ...prev,
      [name]: name === "minTraffic" ? parseInt(value) : value,
    }));
  };

  return (
    <div className="h-screen flex bg-gray-900 text-gray-100">
      <div className="w-3/4 h-full bg-black flex items-center justify-center">
        {graphData.nodes.length > 0 ? (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={window.innerWidth * 0.60} // <-- ensure graph fits only 3/4 of screen
            height={window.innerHeight}
            nodeLabel="name"
            backgroundColor="#000000"
            nodeColor={(node) =>
              node.group === "source" ? "#ff6347" : "#4682b4"
            }
            nodeRelSize={6}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={(link) => Math.sqrt(link.value) * 0.1}
            linkDirectionalParticleColor={() => "#ffffff"}
            linkWidth={(link) => Math.sqrt(link.value) * 0.05}
            linkColor={(link) => {
              // Color links by protocol
              switch (link.protocol) {
                case 6:
                  return "#ff0000"; // TCP - red
                case 17:
                  return "#00ff00"; // UDP - green
                case 1:
                  return "#0000ff"; // ICMP - blue
                default:
                  return "#666666"; // Others - gray
              }
            }}
            onNodeClick={handleNodeClick}
            onLinkClick={handleLinkClick}
            linkLabel={(link) =>
              `${link.source.id} → ${link.target.id}\nBytes: ${link.value}\nPort: ${link.port}\nProtocol: ${link.protocol}`
            }
            // Zoom controls
            enableZoomInteraction={true}
            enablePanInteraction={true}
            minZoom={0.5}
            maxZoom={10}
            cooldownTicks={100}
            cooldownTime={2000}
            // Improved node rendering
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = node.id;
              const fontSize = 12 / globalScale;
              // More stable node sizing with constraints
              const nodeSize =
                Math.min(Math.max(3, node.val * 2), 10) / globalScale;

              // Draw the node circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
              ctx.fillStyle = node.group === "source" ? "#ff6347" : "#4682b4";
              ctx.fill();

              // Only draw text if we're zoomed in enough
              if (globalScale > 0.8) {
                ctx.font = `${fontSize}px Sans-Serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillStyle = "#ffffff";
                ctx.fillText(label, node.x, node.y - nodeSize - 2);
              }

              return node;
            }}
            nodeCanvasObjectMode={() => "replace"}
            // Add automatic fit on load
            onEngineStop={() => {
              if (graphRef.current) {
                graphRef.current.zoomToFit(400, 40);
              }
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-screen text-gray-500">
            <h1 className="text-2xl font-bold">Loading Network Map...</h1>
          </div>
        )}
      </div>

      <div className="w-1/4 bg-gray-800 p-4 border-l border-gray-700 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-blue-300">
          Network Map Controls
        </h2>

        <div className="mb-6">
          <h3 className="font-semibold mb-2 text-gray-300">Filters</h3>

          <div className="mb-3">
            <label className="block text-sm mb-1 text-gray-400">Protocol</label>
            <select
              name="protocol"
              value={filterOptions.protocol}
              onChange={handleFilterChange}
              className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Protocols</option>
              <option value="1">ICMP (1)</option>
              <option value="6">TCP (6)</option>
              <option value="17">UDP (17)</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-sm mb-1 text-gray-400">
              Min Traffic (bytes)
            </label>
            <input
              type="range"
              name="minTraffic"
              min="0"
              max="10000"
              step="100"
              value={filterOptions.minTraffic}
              onChange={handleFilterChange}
              className="w-full accent-blue-500"
            />
            <div className="text-right text-gray-300">
              {filterOptions.minTraffic} bytes
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-sm mb-1 text-gray-400">
              Time Window
            </label>
            <select
              name="timeWindow"
              value={filterOptions.timeWindow}
              onChange={handleFilterChange}
              className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="5">Last 5 Minutes</option>
              <option value="15">Last 15 Minutes</option>
              <option value="30">Last 30 Minutes</option>
              <option value="60">Last Hour</option>
            </select>
          </div>
        </div>

        {selectedNode && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2 text-gray-300">Node Details</h3>
            <div className="bg-gray-700 p-3 rounded border border-gray-600">
              <p className="text-gray-200">
                <span className="font-medium text-blue-300">IP Address:</span>{" "}
                {selectedNode.id}
              </p>
              <p className="text-gray-200">
                <span className="font-medium text-blue-300">Role:</span>{" "}
                {selectedNode.group === "source" ? "Source" : "Destination"}
              </p>
              <p className="text-gray-200">
                <span className="font-medium text-blue-300">Flow Count:</span>{" "}
                {selectedNode.val}
              </p>

              <div className="mt-2">
                <h4 className="font-medium text-blue-300">Recent Flows:</h4>
                <ul className="mt-1 space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
                  {selectedNode.flows.slice(0, 5).map((flow, index) => (
                    <li
                      key={index}
                      className="text-xs p-1 bg-gray-800 rounded cursor-pointer hover:bg-gray-600 text-gray-300"
                      onClick={() =>
                        navigate(`/flow/${flow.timestamp}`, { state: { flow } })
                      }
                    >
                      {flow.src_ip}:{flow.src_port} → {flow.dst_ip}:
                      {flow.dst_port}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="font-semibold mb-2 text-gray-300">Legend</h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
              <span className="text-gray-300">Source Node</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-blue-600 mr-2"></div>
              <span className="text-gray-300">Destination Node</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-600 mr-2"></div>
              <span className="text-gray-300">TCP Traffic</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 mr-2"></div>
              <span className="text-gray-300">UDP Traffic</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-600 mr-2"></div>
              <span className="text-gray-300">ICMP Traffic</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkMap;

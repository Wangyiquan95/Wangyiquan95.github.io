// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Create global mind map manager instance
    window.mindMapManager = new MindMapManager();
    
    // Try to load from localStorage
    const saved = localStorage.getItem('mindMapData');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            window.mindMapManager.loadFromData(data);
        } catch (e) {
            console.log('No saved data found or error loading:', e);
        }
    }
    
    // Add helpful keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Prevent shortcuts when editing in various input types
        if (document.activeElement.tagName === 'TEXTAREA' || 
            document.activeElement.tagName === 'INPUT' ||
            document.activeElement.contentEditable === 'true' ||
            document.querySelector('.sticky-edit-modal') ||
            document.querySelector('.modal:not(.hidden)')) return;
        
        // Escape to exit modes
        if (e.key === 'Escape') {
            e.preventDefault();
            window.mindMapManager.setMode('move');
            window.mindMapManager.clearSelection();
        }
        
        // Ctrl/Cmd + N: Add new node
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            window.mindMapManager.addNode();
        }
        
        // Ctrl/Cmd + T: Add new sticky note
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            window.mindMapManager.addStickyNote();
        }
        
        // Ctrl/Cmd + S: Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            window.mindMapManager.saveToStorage();
        }
        
        // Ctrl/Cmd + O: Load
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            window.mindMapManager.loadFromFile();
        }
        
        // C: Connect mode
        if (e.key === 'c' || e.key === 'C') {
            e.preventDefault();
            window.mindMapManager.setMode('connect');
        }
        
        // D: Delete mode
        if (e.key === 'd' || e.key === 'D') {
            e.preventDefault();
            window.mindMapManager.setMode('delete');
        }
        
        // M: Move mode
        if (e.key === 'm' || e.key === 'M') {
            e.preventDefault();
            window.mindMapManager.setMode('move');
        }
        
        // F: Fit view
        if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            window.mindMapManager.fitView();
        }
    });
    
    // Add welcome message for first-time users
    setTimeout(() => {
        if (window.mindMapManager.nodes.size === 0 && window.mindMapManager.stickyNotes.size === 0) {
            showWelcomeMessage();
        }
    }, 1000);
    
    // Add sample data for demo purposes
    if (window.location.search.includes('demo=true')) {
        loadDemoData();
    }
    
    // Auto-save every 5 minutes instead of 30 seconds
    setInterval(() => {
        if (window.mindMapManager.nodes.size > 0 || window.mindMapManager.stickyNotes.size > 0) {
            // Save silently without showing feedback - INCLUDE STICKY NOTES
            const data = {
                nodes: Array.from(window.mindMapManager.nodes.values()).map(node => node.toJSON()),
                stickyNotes: Array.from(window.mindMapManager.stickyNotes.values()).map(note => note.toJSON()),
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('mindMapData', JSON.stringify(data));
            
            // Show subtle auto-save indicator
            showAutoSaveIndicator();
        }
    }, 120000); // 2 minutes = 120,000 milliseconds (reduced from 5 minutes)
    
    // Additional auto-save on any major action (Mac-optimized)
    window.addEventListener('beforeunload', () => {
        if (window.mindMapManager && (window.mindMapManager.nodes.size > 0 || window.mindMapManager.stickyNotes.size > 0)) {
            window.mindMapManager.autoSave();
        }
    });
    
    // Auto-save when window loses focus (great for Mac window management)
    window.addEventListener('blur', () => {
        if (window.mindMapManager && (window.mindMapManager.nodes.size > 0 || window.mindMapManager.stickyNotes.size > 0)) {
            window.mindMapManager.autoSave();
        }
    });
    
    // Auto-save when page becomes hidden (Mac tab switching)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && window.mindMapManager && (window.mindMapManager.nodes.size > 0 || window.mindMapManager.stickyNotes.size > 0)) {
            window.mindMapManager.autoSave();
        }
    });
});

function showWelcomeMessage() {
    const welcomeOverlay = document.createElement('div');
    welcomeOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    const welcomeCard = document.createElement('div');
    welcomeCard.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 16px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 20px 64px rgba(0,0,0,0.3);
        transform: scale(0.9);
        transition: transform 0.3s ease;
    `;
    
    welcomeCard.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">🧠</div>
        <h2 style="color: #374151; margin-bottom: 16px;">Welcome to Mind Map Notes!</h2>
        <p style="color: #6b7280; margin-bottom: 24px; line-height: 1.6;">
            Create visual connections between your ideas and organize your thoughts freely in space.
        </p>
        <div style="text-align: left; margin-bottom: 24px; color: #6b7280; font-size: 14px;">
            <p><strong>Quick Tips:</strong></p>
            <ul style="list-style: none; padding: 0;">
                <li>• Click "Add Node" to create ideas</li>
                <li>• Drag nodes to position them freely</li>
                <li>• Use "Connect Mode" to link related ideas</li>
                <li>• Double-click any node to edit it</li>
                <li>• Press 'C' for connect, 'D' for delete, 'M' for move mode</li>
                <li>• Press 'F' to fit all nodes in view</li>
            </ul>
        </div>
        <button id="startBtn" style="
            background: #4f46e5;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            margin-right: 12px;
        ">Get Started</button>
        <button id="demoBtn" style="
            background: #6b7280;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
        ">Load Demo</button>
    `;
    
    welcomeOverlay.appendChild(welcomeCard);
    document.body.appendChild(welcomeOverlay);
    
    // Animate in
    setTimeout(() => {
        welcomeOverlay.style.opacity = '1';
        welcomeCard.style.transform = 'scale(1)';
    }, 100);
    
    // Event listeners
    document.getElementById('startBtn').addEventListener('click', () => {
        closeWelcome();
        window.mindMapManager.addNode('My First Idea');
    });
    
    document.getElementById('demoBtn').addEventListener('click', () => {
        closeWelcome();
        loadDemoData();
    });
    
    // Close on outside click
    welcomeOverlay.addEventListener('click', (e) => {
        if (e.target === welcomeOverlay) {
            closeWelcome();
        }
    });
    
    function closeWelcome() {
        welcomeOverlay.style.opacity = '0';
        setTimeout(() => {
            if (welcomeOverlay.parentNode) {
                document.body.removeChild(welcomeOverlay);
            }
        }, 300);
    }
}

function loadDemoData() {
    const demoNodes = [
        { text: 'AI Platform', x: 300, y: 200, color: '#3b82f6' },
        { text: 'UF (University of Florida)', x: 150, y: 120, color: '#10b981' },
        { text: 'UIUC (University of Illinois)', x: 450, y: 120, color: '#10b981' },
        { text: 'Flow', x: 300, y: 320, color: '#f59e0b' },
        { text: 'Research', x: 100, y: 250, color: '#8b5cf6' },
        { text: 'Applications', x: 500, y: 250, color: '#8b5cf6' },
        { text: 'Data Processing', x: 200, y: 380, color: '#06b6d4' },
        { text: 'Machine Learning', x: 400, y: 380, color: '#06b6d4' }
    ];
    
    // Create nodes
    const nodeMap = new Map();
    demoNodes.forEach((nodeData, index) => {
        const node = window.mindMapManager.addNode(nodeData.text, nodeData.x, nodeData.y, nodeData.color);
        nodeMap.set(index, node);
    });
    
    // Create connections (similar to your whiteboard structure)
    const connections = [
        [0, 1], // AI Platform -> UF
        [0, 2], // AI Platform -> UIUC
        [0, 3], // AI Platform -> Flow
        [1, 4], // UF -> Research
        [2, 5], // UIUC -> Applications
        [3, 6], // Flow -> Data Processing
        [3, 7], // Flow -> Machine Learning
        [4, 6], // Research -> Data Processing
        [5, 7]  // Applications -> Machine Learning
    ];
    
    // Add connections
    connections.forEach(([from, to]) => {
        const fromNode = nodeMap.get(from);
        const toNode = nodeMap.get(to);
        if (fromNode && toNode) {
            window.mindMapManager.createConnection(fromNode, toNode);
        }
    });
    
    // Fit view to show all nodes
    setTimeout(() => {
        window.mindMapManager.fitView();
    }, 500);
}

function showAutoSaveIndicator() {
    // Create or update auto-save indicator
    let indicator = document.getElementById('autoSaveIndicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'autoSaveIndicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(16, 185, 129, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        indicator.innerHTML = '<i class="fas fa-check-circle"></i> Auto-saved';
        document.body.appendChild(indicator);
    }
    
    // Show indicator
    indicator.style.opacity = '1';
    
    // Hide after 2 seconds
    setTimeout(() => {
        indicator.style.opacity = '0';
    }, 2000);
}

// Global function to trigger auto-save from any component
window.triggerAutoSave = function() {
    if (window.mindMapManager && (window.mindMapManager.nodes.size > 0 || window.mindMapManager.stickyNotes.size > 0)) {
        window.mindMapManager.autoSave();
        showAutoSaveIndicator();
    }
};

// Add some utility functions for power users
window.TreeNotesUtils = {
    exportAsText: function(indent = '  ') {
        const rootNodes = window.treeManager.rootNodes;
        let output = '';
        
        function nodeToText(node, level = 0) {
            const prefix = indent.repeat(level);
            output += prefix + node.text + '\n';
            node.children.forEach(child => nodeToText(child, level + 1));
        }
        
        rootNodes.forEach(node => nodeToText(node));
        return output;
    },
    
    exportAsMarkdown: function() {
        return window.treeManager.generateMarkdown();
    },
    
    getStatistics: function() {
        const allNodes = window.treeManager.getAllNodes();
        const totalNodes = allNodes.length;
        const maxDepth = Math.max(...allNodes.map(node => {
            let depth = 0;
            let current = node.parent;
            while (current) {
                depth++;
                current = current.parent;
            }
            return depth;
        }));
        
        return {
            totalNodes,
            rootNodes: window.treeManager.rootNodes.length,
            maxDepth: maxDepth + 1,
            averageChildren: totalNodes > 0 ? 
                allNodes.reduce((sum, node) => sum + node.children.length, 0) / totalNodes : 0
        };
    }
};

// Export for debugging/power user features
window.TreeNotes = {
    manager: window.treeManager,
    utils: window.TreeNotesUtils
}; 
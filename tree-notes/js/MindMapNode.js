class MindMapNode {
    constructor(text = 'New Node', x = 100, y = 100, color = '#3b82f6') {
        this.id = this.generateId();
        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.width = 80; // Minimum width, will be adjusted automatically
        this.height = 40; // Minimum height, will be adjusted automatically
        this.connections = new Set(); // Set of node IDs this node is connected to
        this.element = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
    }

    generateId() {
        return 'node_' + Math.random().toString(36).substr(2, 9);
    }

    // Create HTML element for this node
    render() {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'mind-map-node';
        nodeDiv.setAttribute('data-node-id', this.id);
        nodeDiv.style.cssText = `
            position: absolute;
            left: ${this.x}px;
            top: ${this.y}px;
            min-width: 80px;
            max-width: 250px;
            min-height: 40px;
            width: auto;
            height: auto;
            background: ${this.color};
            border: 2px solid ${this.darkenColor(this.color)};
            border-radius: 12px;
            padding: 8px 12px;
            cursor: move;
            user-select: none;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: white;
            font-weight: 500;
            font-size: 13px;
            line-height: 1.4;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: transform 0.2s ease;
            z-index: 10;
            word-wrap: break-word;
            word-break: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
        `;

        nodeDiv.innerHTML = `<div class="node-text" style="width: 100%; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word;">${this.escapeHtml(this.text)}</div>`;

        this.addEventListeners(nodeDiv);
        this.element = nodeDiv;
        
        // Use setTimeout to ensure the element is in the DOM before measuring
        setTimeout(() => {
            this.adjustSize();
        }, 0);

        return nodeDiv;
    }

    addEventListeners(nodeDiv) {
        // Mouse events for dragging
        nodeDiv.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only left click
            
            // Handle special modes first, but don't prevent dragging
            if (window.mindMapManager.mode === 'connect') {
                window.mindMapManager.handleNodeClick(this);
                // Don't return here - allow dragging to continue
            } else if (window.mindMapManager.mode === 'delete') {
                window.mindMapManager.deleteNode(this);
                return; // Do return here since node is deleted
            }

            // Always allow dragging (even in connect mode)
            this.startDrag(e);
        });

        // Touch events for mobile devices
        nodeDiv.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling
            const touch = e.touches[0];
            
            // Handle special modes first, but don't prevent dragging
            if (window.mindMapManager.mode === 'connect') {
                window.mindMapManager.handleNodeClick(this);
                // Don't return here - allow dragging to continue
            } else if (window.mindMapManager.mode === 'delete') {
                window.mindMapManager.deleteNode(this);
                return; // Do return here since node is deleted
            }

            // Convert touch to mouse-like event for dragging
            const mouseEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => e.preventDefault()
            };
            this.startDrag(mouseEvent);
        });

        // Double-click to edit
        nodeDiv.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.startEdit();
        });

        // Double-tap for mobile (since dblclick doesn't work well on mobile)
        let tapCount = 0;
        let tapTimer = null;
        nodeDiv.addEventListener('touchend', (e) => {
            tapCount++;
            if (tapCount === 1) {
                tapTimer = setTimeout(() => {
                    tapCount = 0;
                }, 300);
            } else if (tapCount === 2) {
                clearTimeout(tapTimer);
                tapCount = 0;
                e.preventDefault();
                this.startEdit();
            }
        });

        // Right-click for context menu
        nodeDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e);
        });

        // Long press for mobile context menu
        let longPressTimer = null;
        nodeDiv.addEventListener('touchstart', (e) => {
            longPressTimer = setTimeout(() => {
                e.preventDefault();
                const touch = e.touches[0];
                const contextEvent = {
                    pageX: touch.pageX,
                    pageY: touch.pageY
                };
                this.showContextMenu(contextEvent);
            }, 500);
        });

        nodeDiv.addEventListener('touchend', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        });

        nodeDiv.addEventListener('touchmove', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        });

        // Hover effects (only for non-touch devices)
        if (!('ontouchstart' in window)) {
            nodeDiv.addEventListener('mouseenter', () => {
                if (!this.isDragging) {
                    nodeDiv.style.transform = 'scale(1.05)';
                }
            });

            nodeDiv.addEventListener('mouseleave', () => {
                if (!this.isDragging) {
                    nodeDiv.style.transform = 'scale(1)';
                }
            });
        }
    }

    startDrag(e) {
        e.preventDefault();
        this.isDragging = true;
        
        // Get initial position from either mouse or touch event
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        this.dragOffset.x = clientX - this.x;
        this.dragOffset.y = clientY - this.y;

        const containerRect = document.getElementById('canvasContainer').getBoundingClientRect();
        this.dragOffset.x -= containerRect.left;
        this.dragOffset.y -= containerRect.top;

        if (this.element) {
            this.element.style.zIndex = '100';
            this.element.style.transform = 'scale(1.1)';
        }

        const handleMove = (e) => {
            if (!this.isDragging) return;

            // Get position from either mouse or touch event
            const moveClientX = e.clientX || (e.touches && e.touches[0].clientX);
            const moveClientY = e.clientY || (e.touches && e.touches[0].clientY);

            const containerRect = document.getElementById('canvasContainer').getBoundingClientRect();
            this.x = moveClientX - containerRect.left - this.dragOffset.x;
            this.y = moveClientY - containerRect.top - this.dragOffset.y;

            // Keep node within bounds
            this.x = Math.max(0, Math.min(this.x, containerRect.width - this.width));
            this.y = Math.max(0, Math.min(this.y, containerRect.height - this.height));

            this.updatePosition();
            window.mindMapManager.redrawConnections();
        };

        const handleEnd = () => {
            this.isDragging = false;
            if (this.element) {
                this.element.style.zIndex = '10';
                this.element.style.transform = 'scale(1)';
            }
            
            // Remove all event listeners
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
            
            // Trigger auto-save after moving a node
            if (window.triggerAutoSave) {
                window.triggerAutoSave();
            }
        };

        // Add both mouse and touch event listeners
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
    }

    updatePosition() {
        if (this.element) {
            this.element.style.left = `${this.x}px`;
            this.element.style.top = `${this.y}px`;
        }
    }

    adjustSize() {
        if (!this.element) return;

        // Force a reflow to ensure accurate measurements
        this.element.offsetHeight;
        
        // Get the actual dimensions after text wrapping
        const rect = this.element.getBoundingClientRect();
        this.width = Math.max(80, Math.ceil(rect.width));
        this.height = Math.max(40, Math.ceil(rect.height));
        
        // Update the stored dimensions for connection calculations and boundary checks
        // The element already has the correct visual size due to auto width/height
    }

    addConnection(nodeId) {
        this.connections.add(nodeId);
    }

    removeConnection(nodeId) {
        this.connections.delete(nodeId);
    }

    hasConnection(nodeId) {
        return this.connections.has(nodeId);
    }

    getCenter() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }

    startEdit() {
        window.mindMapManager.editNode(this);
    }

    showContextMenu(e) {
        window.mindMapManager.showContextMenu(e, this);
    }

    changeColor(newColor) {
        this.color = newColor;
        if (this.element) {
            this.element.style.background = this.color;
            this.element.style.borderColor = this.darkenColor(this.color);
        }
        
        // Trigger auto-save after color change
        if (window.triggerAutoSave) {
            window.triggerAutoSave();
        }
    }

    updateText(newText) {
        this.text = newText;
        if (this.element) {
            const textElement = this.element.querySelector('.node-text');
            if (textElement) {
                textElement.innerHTML = this.escapeHtml(this.text);
            }
            // Use setTimeout to ensure DOM is updated before measuring
            setTimeout(() => {
                this.adjustSize();
                // Redraw connections since node size may have changed
                if (window.mindMapManager) {
                    window.mindMapManager.redrawConnections();
                }
                
                // Trigger auto-save after text update
                if (window.triggerAutoSave) {
                    window.triggerAutoSave();
                }
            }, 0);
        }
    }

    darkenColor(color) {
        // Simple color darkening function
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 30);
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 30);
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 30);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }

    duplicate() {
        return new MindMapNode(
            this.text + ' (copy)',
            this.x + 20,
            this.y + 20,
            this.color
        );
    }

    toJSON() {
        return {
            id: this.id,
            text: this.text,
            x: this.x,
            y: this.y,
            color: this.color,
            width: this.width,
            height: this.height,
            connections: Array.from(this.connections)
        };
    }

    static fromJSON(data) {
        const node = new MindMapNode(data.text, data.x, data.y, data.color);
        node.id = data.id;
        node.width = data.width || 120;
        node.height = data.height || 40;
        node.connections = new Set(data.connections || []);
        return node;
    }
} 
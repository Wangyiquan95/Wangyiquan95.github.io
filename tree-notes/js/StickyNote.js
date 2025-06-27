class StickyNote {
    constructor(x = 100, y = 100, color = '#fef3c7', width = 250, height = 200) {
        this.id = 'sticky_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;
        this.color = color;
        this.width = width;
        this.height = height;
        this.content = '';
        this.isTodoList = false;
        this.textAlign = 'left';
        this.fontSize = 14;
        this.fontWeight = 'normal';
        this.fontStyle = 'normal';
        this.textDecoration = 'none';
        this.todos = [];
        this.element = null;
        this.isEditing = false;
        this.isDragging = false;
        this.isResizing = false;
        this.resizeDirection = null;
        
        this.dragOffset = { x: 0, y: 0 };
    }

    toJSON() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            color: this.color,
            width: this.width,
            height: this.height,
            content: this.content,
            isTodoList: this.isTodoList,
            textAlign: this.textAlign,
            fontSize: this.fontSize,
            fontWeight: this.fontWeight,
            fontStyle: this.fontStyle,
            textDecoration: this.textDecoration,
            todos: this.todos
        };
    }

    static fromJSON(data) {
        const note = new StickyNote(data.x, data.y, data.color, data.width, data.height);
        note.id = data.id;
        note.content = data.content || '';
        note.isTodoList = data.isTodoList || false;
        note.textAlign = data.textAlign || 'left';
        note.fontSize = data.fontSize || 14;
        note.fontWeight = data.fontWeight || 'normal';
        note.fontStyle = data.fontStyle || 'normal';
        note.textDecoration = data.textDecoration || 'none';
        note.todos = data.todos || [];
        return note;
    }

    render() {
        // If element already exists, return it (prevent double rendering)
        if (this.element && this.element.parentNode) {
            return this.element;
        }

        this.element = document.createElement('div');
        this.element.className = 'sticky-note';
        this.element.setAttribute('data-sticky-id', this.id);
        this.element.style.cssText = `
            position: absolute;
            left: ${this.x}px;
            top: ${this.y}px;
            width: ${this.width}px;
            height: ${this.height}px;
            background: ${this.color};
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border: 2px solid rgba(0,0,0,0.1);
            cursor: move;
            user-select: none;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: transform 0.2s ease;
            z-index: 100;
        `;

        // Header with controls
        const header = document.createElement('div');
        header.className = 'sticky-header';
        header.style.cssText = `
            padding: 8px;
            border-bottom: 1px solid rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(0,0,0,0.05);
            cursor: move;
        `;

        const typeSelector = document.createElement('select');
        typeSelector.className = 'type-selector';
        typeSelector.style.cssText = `
            border: none;
            background: transparent;
            font-size: 12px;
            cursor: pointer;
        `;
        typeSelector.innerHTML = `
            <option value="text" ${!this.isTodoList ? 'selected' : ''}>📝 Text</option>
            <option value="todo" ${this.isTodoList ? 'selected' : ''}>☑️ Todo</option>
        `;

        const controls = document.createElement('div');
        controls.style.cssText = `
            display: flex;
            gap: 4px;
            align-items: center;
        `;

        const editBtn = document.createElement('button');
        editBtn.innerHTML = '✏️';
        editBtn.title = 'Edit';
        editBtn.className = 'sticky-edit-btn';
        editBtn.style.cssText = `
            border: none;
            background: none;
            cursor: pointer;
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 12px;
        `;

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Delete';
        deleteBtn.className = 'sticky-delete-btn';
        deleteBtn.style.cssText = `
            border: none;
            background: none;
            cursor: pointer;
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 12px;
            color: #ef4444;
        `;

        controls.appendChild(editBtn);
        controls.appendChild(deleteBtn);
        header.appendChild(typeSelector);
        header.appendChild(controls);

        // Content area
        const content = document.createElement('div');
        content.className = 'sticky-content';
        content.style.cssText = `
            flex: 1;
            padding: 12px;
            overflow-y: auto;
            text-align: ${this.textAlign};
            font-size: ${this.fontSize}px;
            font-weight: ${this.fontWeight};
            font-style: ${this.fontStyle};
            text-decoration: ${this.textDecoration};
            line-height: 1.4;
        `;

        this.updateContent(content);

        // Resize handles
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.style.cssText = `
            position: absolute;
            bottom: 0;
            right: 0;
            width: 12px;
            height: 12px;
            cursor: se-resize;
            background: linear-gradient(-45deg, transparent 30%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.3) 70%, transparent 70%);
        `;

        this.element.appendChild(header);
        this.element.appendChild(content);
        this.element.appendChild(resizeHandle);

        // Setup event listeners AFTER DOM structure is complete
        this.setupEventListeners();

        return this.element;
    }

    updateContent(contentElement) {
        if (this.isTodoList) {
            this.renderTodoList(contentElement);
        } else {
            this.renderText(contentElement);
        }
    }

    renderText(contentElement) {
        const displayText = this.content || 'Click edit to add content...';
        contentElement.innerHTML = displayText.replace(/\n/g, '<br>');
        if (!this.content) {
            contentElement.style.color = '#999';
            contentElement.style.fontStyle = 'italic';
        } else {
            contentElement.style.color = '';
            contentElement.style.fontStyle = this.fontStyle;
        }
    }

    renderTodoList(contentElement) {
        contentElement.innerHTML = '';
        contentElement.style.color = '';
        contentElement.style.fontStyle = this.fontStyle;
        
        if (this.todos.length === 0) {
            contentElement.innerHTML = '<div style="color: #999; font-style: italic;">Click edit to add todos...</div>';
            return;
        }
        
        this.todos.forEach((todo, index) => {
            const todoItem = document.createElement('div');
            todoItem.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 4px;
                padding: 2px 0;
            `;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = todo.completed;
            checkbox.style.cssText = `
                margin: 0;
                cursor: pointer;
            `;

            const label = document.createElement('span');
            label.textContent = todo.text;
            label.style.cssText = `
                flex: 1;
                cursor: pointer;
                ${todo.completed ? 'text-decoration: line-through; color: #999;' : ''}
            `;

            // Toggle completion
            const toggleComplete = () => {
                this.todos[index].completed = !this.todos[index].completed;
                this.updateContent(contentElement);
                this.autoSave();
            };

            checkbox.addEventListener('change', toggleComplete);
            label.addEventListener('click', toggleComplete);

            todoItem.appendChild(checkbox);
            todoItem.appendChild(label);
            contentElement.appendChild(todoItem);
        });
    }

    addTodoItem(text = 'New task') {
        this.todos.push({ text, completed: false });
        this.updateContent(this.element.querySelector('.sticky-content'));
    }

    setupEventListeners() {
        if (!this.element) return;

        const header = this.element.querySelector('.sticky-header');
        const typeSelector = this.element.querySelector('.type-selector');
        const editBtn = this.element.querySelector('.sticky-edit-btn');
        const deleteBtn = this.element.querySelector('.sticky-delete-btn');
        const resizeHandle = this.element.querySelector('.resize-handle');

        // Prevent event bubbling for controls
        const stopBubbling = (e) => e.stopPropagation();

        // Type change
        typeSelector.addEventListener('change', (e) => {
            stopBubbling(e);
            this.isTodoList = e.target.value === 'todo';
            if (this.isTodoList && this.todos.length === 0) {
                this.addTodoItem('First task');
            }
            this.updateContent(this.element.querySelector('.sticky-content'));
            this.autoSave();
        });

        // Edit button
        editBtn.addEventListener('click', (e) => {
            stopBubbling(e);
            this.startEditing();
        });

        // Delete button
        deleteBtn.addEventListener('click', (e) => {
            stopBubbling(e);
            if (confirm('Delete this sticky note?')) {
                window.mindMapManager.deleteStickyNote(this);
            }
        });

        // Double-click to edit
        this.element.addEventListener('dblclick', (e) => {
            stopBubbling(e);
            this.startEditing();
        });

        // Drag functionality
        this.setupDragHandlers(header);
        
        // Resize functionality
        this.setupResizeHandlers(resizeHandle);
    }

    setupDragHandlers(header) {
        let startX, startY, startMouseX, startMouseY;

        const startDrag = (e) => {
            if (this.isEditing || this.isResizing) return;
            
            this.isDragging = true;
            startX = this.x;
            startY = this.y;
            startMouseX = e.clientX || e.touches[0].clientX;
            startMouseY = e.clientY || e.touches[0].clientY;
            
            this.element.style.zIndex = '1000';
            this.element.style.transform = 'scale(1.02)';
            
            e.preventDefault();
            e.stopPropagation();
        };

        const drag = (e) => {
            if (!this.isDragging) return;
            
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            
            const deltaX = clientX - startMouseX;
            const deltaY = clientY - startMouseY;
            
            this.x = startX + deltaX;
            this.y = startY + deltaY;
            
            this.element.style.left = this.x + 'px';
            this.element.style.top = this.y + 'px';
            
            e.preventDefault();
        };

        const endDrag = () => {
            if (!this.isDragging) return;
            
            this.isDragging = false;
            this.element.style.cursor = 'move';
            this.element.style.transform = '';
            this.element.style.zIndex = '100';
            
            // Auto-save after moving
            this.autoSave();
        };

        // Mouse events
        header.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);

        // Touch events
        header.addEventListener('touchstart', startDrag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('touchend', endDrag);
    }

    setupResizeHandlers(resizeHandle) {
        let startWidth, startHeight, startMouseX, startMouseY;

        const startResize = (e) => {
            e.stopPropagation();
            this.isResizing = true;
            startWidth = this.width;
            startHeight = this.height;
            startMouseX = e.clientX || e.touches[0].clientX;
            startMouseY = e.clientY || e.touches[0].clientY;
            e.preventDefault();
        };

        const resize = (e) => {
            if (!this.isResizing) return;
            
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            
            const deltaX = clientX - startMouseX;
            const deltaY = clientY - startMouseY;
            
            this.width = Math.max(150, startWidth + deltaX);
            this.height = Math.max(100, startHeight + deltaY);
            
            this.element.style.width = this.width + 'px';
            this.element.style.height = this.height + 'px';
            
            e.preventDefault();
        };

        const endResize = () => {
            if (this.isResizing) {
                this.isResizing = false;
                this.autoSave();
            }
        };

        resizeHandle.addEventListener('mousedown', startResize);
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', endResize);

        resizeHandle.addEventListener('touchstart', startResize);
        document.addEventListener('touchmove', resize);
        document.addEventListener('touchend', endResize);
    }

    autoSave() {
        // Debounced auto-save
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        this.autoSaveTimeout = setTimeout(() => {
            if (window.mindMapManager) {
                window.mindMapManager.autoSave();
            }
        }, 500);
    }

    startEditing() {
        if (this.isEditing) return;
        this.isEditing = true;
        this.showEditModal();
    }

    showEditModal() {
        const modal = document.createElement('div');
        modal.className = 'sticky-edit-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 64px rgba(0,0,0,0.3);
        `;

        modalContent.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #374151;">Edit ${this.isTodoList ? 'Todo List' : 'Sticky Note'}</h3>
            
            <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Type:</label>
                    <select id="editType" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                        <option value="text" ${!this.isTodoList ? 'selected' : ''}>📝 Text Note</option>
                        <option value="todo" ${this.isTodoList ? 'selected' : ''}>☑️ Todo List</option>
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Color:</label>
                    <select id="editColor" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                        <option value="#fef3c7" ${this.color === '#fef3c7' ? 'selected' : ''}>🟡 Yellow</option>
                        <option value="#dbeafe" ${this.color === '#dbeafe' ? 'selected' : ''}>🔵 Blue</option>
                        <option value="#dcfce7" ${this.color === '#dcfce7' ? 'selected' : ''}>🟢 Green</option>
                        <option value="#fed7e2" ${this.color === '#fed7e2' ? 'selected' : ''}>🌸 Pink</option>
                        <option value="#e0e7ff" ${this.color === '#e0e7ff' ? 'selected' : ''}>🟣 Purple</option>
                        <option value="#f3f4f6" ${this.color === '#f3f4f6' ? 'selected' : ''}>⚪ Gray</option>
                    </select>
                </div>
            </div>

            <div id="textFormatting" style="margin-bottom: 20px; ${this.isTodoList ? 'display: none;' : ''}">
                <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Text Formatting:</label>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
                    <button type="button" id="boldBtn" class="format-btn" style="padding: 6px 12px; border: 1px solid #d1d5db; background: ${this.fontWeight === 'bold' ? '#3b82f6' : 'white'}; color: ${this.fontWeight === 'bold' ? 'white' : '#374151'}; border-radius: 4px; cursor: pointer; font-weight: bold;">B</button>
                    <button type="button" id="italicBtn" class="format-btn" style="padding: 6px 12px; border: 1px solid #d1d5db; background: ${this.fontStyle === 'italic' ? '#3b82f6' : 'white'}; color: ${this.fontStyle === 'italic' ? 'white' : '#374151'}; border-radius: 4px; cursor: pointer; font-style: italic;">I</button>
                    <button type="button" id="underlineBtn" class="format-btn" style="padding: 6px 12px; border: 1px solid #d1d5db; background: ${this.textDecoration === 'underline' ? '#3b82f6' : 'white'}; color: ${this.textDecoration === 'underline' ? 'white' : '#374151'}; border-radius: 4px; cursor: pointer; text-decoration: underline;">U</button>
                </div>
                <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
                    <label style="font-weight: 500; color: #374151;">Align:</label>
                    <button type="button" id="alignLeft" class="align-btn" style="padding: 6px 8px; border: 1px solid #d1d5db; background: ${this.textAlign === 'left' ? '#3b82f6' : 'white'}; color: ${this.textAlign === 'left' ? 'white' : '#374151'}; border-radius: 4px; cursor: pointer;">⬅️</button>
                    <button type="button" id="alignCenter" class="align-btn" style="padding: 6px 8px; border: 1px solid #d1d5db; background: ${this.textAlign === 'center' ? '#3b82f6' : 'white'}; color: ${this.textAlign === 'center' ? 'white' : '#374151'}; border-radius: 4px; cursor: pointer;">↔️</button>
                    <button type="button" id="alignRight" class="align-btn" style="padding: 6px 8px; border: 1px solid #d1d5db; background: ${this.textAlign === 'right' ? '#3b82f6' : 'white'}; color: ${this.textAlign === 'right' ? 'white' : '#374151'}; border-radius: 4px; cursor: pointer;">➡️</button>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <label style="font-weight: 500; color: #374151;">Size:</label>
                    <select id="fontSize" style="padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                        <option value="12" ${this.fontSize === 12 ? 'selected' : ''}>12px</option>
                        <option value="14" ${this.fontSize === 14 ? 'selected' : ''}>14px</option>
                        <option value="16" ${this.fontSize === 16 ? 'selected' : ''}>16px</option>
                        <option value="18" ${this.fontSize === 18 ? 'selected' : ''}>18px</option>
                        <option value="20" ${this.fontSize === 20 ? 'selected' : ''}>20px</option>
                    </select>
                </div>
            </div>

            <div id="contentArea">
                ${this.isTodoList ? this.renderTodoEditor() : this.renderTextEditor()}
            </div>

            <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
                <button id="cancelEdit" style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; cursor: pointer;">Cancel</button>
                <button id="saveEdit" style="padding: 8px 16px; border: none; background: #3b82f6; color: white; border-radius: 6px; cursor: pointer;">Save</button>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        this.setupModalEventListeners(modal);
    }

    renderTextEditor() {
        return `
            <div>
                <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Content:</label>
                <textarea id="editContent" style="width: 100%; height: 200px; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-family: inherit; resize: vertical;" placeholder="Enter your text here...">${this.content}</textarea>
            </div>
        `;
    }

    renderTodoEditor() {
        return `
            <div>
                <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Todo Items:</label>
                <div id="todoItems" style="margin-bottom: 12px;">
                    ${this.todos.map((todo, index) => `
                        <div class="todo-edit-item" style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                            <input type="checkbox" ${todo.completed ? 'checked' : ''} data-index="${index}" style="margin: 0;">
                            <input type="text" value="${todo.text}" data-index="${index}" style="flex: 1; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px;">
                            <button type="button" onclick="this.parentElement.remove()" style="padding: 4px 8px; border: none; background: #ef4444; color: white; border-radius: 4px; cursor: pointer;">×</button>
                        </div>
                    `).join('')}
                </div>
                <button type="button" id="addTodoItem" style="padding: 8px 12px; border: 1px dashed #6b7280; background: transparent; color: #6b7280; border-radius: 4px; cursor: pointer; width: 100%;">+ Add Todo Item</button>
            </div>
        `;
    }

    setupModalEventListeners(modal) {
        const editType = modal.querySelector('#editType');
        const editColor = modal.querySelector('#editColor');
        const editContent = modal.querySelector('#editContent');
        const saveBtn = modal.querySelector('#saveEdit');
        const cancelBtn = modal.querySelector('#cancelEdit');

        // Type change
        editType.addEventListener('change', () => {
            const wasText = !this.isTodoList;
            this.isTodoList = editType.value === 'todo';
            
            // Convert between types
            if (wasText && this.isTodoList) {
                // Convert text to to-do items
                if (this.content.trim()) {
                    this.todos = this.content.split('\n').filter(line => line.trim()).map(line => ({
                        text: line.trim(),
                        completed: false
                    }));
                }
                if (this.todos.length === 0) {
                    this.todos = [{ text: 'New task', completed: false }];
                }
            } else if (!wasText && !this.isTodoList) {
                // Convert to-do items to text
                this.content = this.todos.map(todo => todo.text).join('\n');
            }

            // Toggle formatting visibility
            const textFormatting = modal.querySelector('#textFormatting');
            textFormatting.style.display = this.isTodoList ? 'none' : 'block';

            // Update content area
            const contentArea = modal.querySelector('#contentArea');
            contentArea.innerHTML = this.isTodoList ? this.renderTodoEditor() : this.renderTextEditor();

            // Re-setup to-do events if needed
            if (this.isTodoList) {
                this.setupTodoModalEvents(modal);
            }
        });

        // Color change
        editColor.addEventListener('change', () => {
            this.color = editColor.value;
            this.element.style.background = this.color;
        });

        // Formatting buttons
        const formatBtns = modal.querySelectorAll('.format-btn');
        formatBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const isActive = btn.style.background === 'rgb(59, 130, 246)';
                btn.style.background = isActive ? 'white' : '#3b82f6';
                btn.style.color = isActive ? '#374151' : 'white';
                
                if (btn.id === 'boldBtn') {
                    this.fontWeight = isActive ? 'normal' : 'bold';
                } else if (btn.id === 'italicBtn') {
                    this.fontStyle = isActive ? 'normal' : 'italic';
                } else if (btn.id === 'underlineBtn') {
                    this.textDecoration = isActive ? 'none' : 'underline';
                }
            });
        });

        // Alignment buttons
        const alignBtns = modal.querySelectorAll('.align-btn');
        alignBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                alignBtns.forEach(b => {
                    b.style.background = 'white';
                    b.style.color = '#374151';
                });
                btn.style.background = '#3b82f6';
                btn.style.color = 'white';
                
                if (btn.id === 'alignLeft') this.textAlign = 'left';
                else if (btn.id === 'alignCenter') this.textAlign = 'center';
                else if (btn.id === 'alignRight') this.textAlign = 'right';
            });
        });

        // Font size
        const fontSize = modal.querySelector('#fontSize');
        if (fontSize) {
            fontSize.addEventListener('change', () => {
                this.fontSize = parseInt(fontSize.value);
            });
        }

        // Setup to-do events if in to-do mode
        if (this.isTodoList) {
            this.setupTodoModalEvents(modal);
        }

        // Save and cancel
        saveBtn.addEventListener('click', () => {
            if (!this.isTodoList && editContent) {
                this.content = editContent.value;
            } else if (this.isTodoList) {
                this.saveTodosFromModal(modal);
            }
            
            this.updateVisualStyle();
            this.updateContent(this.element.querySelector('.sticky-content'));
            this.isEditing = false;
            document.body.removeChild(modal);
            
            // Auto-save after editing
            this.autoSave();
        });

        cancelBtn.addEventListener('click', () => {
            this.isEditing = false;
            document.body.removeChild(modal);
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.isEditing = false;
                document.body.removeChild(modal);
            }
        });
    }

    setupTodoModalEvents(modal) {
        const addBtn = modal.querySelector('#addTodoItem');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const todoItems = modal.querySelector('#todoItems');
                const newIndex = todoItems.children.length;
                const newItem = document.createElement('div');
                newItem.className = 'todo-edit-item';
                newItem.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;';
                newItem.innerHTML = `
                    <input type="checkbox" data-index="${newIndex}" style="margin: 0;">
                    <input type="text" value="New task" data-index="${newIndex}" style="flex: 1; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px;">
                    <button type="button" onclick="this.parentElement.remove()" style="padding: 4px 8px; border: none; background: #ef4444; color: white; border-radius: 4px; cursor: pointer;">×</button>
                `;
                todoItems.appendChild(newItem);
            });
        }
    }

    saveTodosFromModal(modal) {
        const todoItems = modal.querySelectorAll('.todo-edit-item');
        this.todos = Array.from(todoItems).map(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const textInput = item.querySelector('input[type="text"]');
            return {
                text: textInput.value,
                completed: checkbox.checked
            };
        });
    }

    updateVisualStyle() {
        if (this.element) {
            this.element.style.background = this.color;
            const content = this.element.querySelector('.sticky-content');
            if (content) {
                content.style.textAlign = this.textAlign;
                content.style.fontSize = this.fontSize + 'px';
                content.style.fontWeight = this.fontWeight;
                content.style.fontStyle = this.fontStyle;
                content.style.textDecoration = this.textDecoration;
            }
        }
    }
} 
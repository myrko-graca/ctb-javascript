export class CustomSelect {
	constructor(elemento, obj) {
		if (!elemento) {
			elemento = document.createElement("div");
			elemento.style.height = "30px";
			document.body.appendChild(elemento);
		}
		this.elemento = elemento;
		this.options = obj?.opcoes;
		this.placeholder = obj?.placeholder;
		this.selectedValue = null;
		this.items = [];
		this.focusedItemIndex = -1; // Controle do foco por teclado
		
		this.init();
	}
	init() {
		this.createDOM();
		this.setupEvents();
	}
	createDOM() {
		this.elemento.textContent = '';
		this.wrapper = document.createElement('div');
		this.wrapper.style.position = "relative";
		this.wrapper.style.width = "100%";
		this.wrapper.style.height = "100%";
		this.wrapper.style.fontFamily = "arial";
		this.wrapper.style.fontSize = "medium";
		
		this.btn = document.createElement('div');
		this.btn.tabIndex = 0; 
		this.btn.style.width = "100%";
		this.btn.style.height = "100%";
		this.btn.style.border = "1px solid rgb(118, 118, 118)";
		this.btn.style.background = '#fff';
		this.btn.style.textAlign = 'left';
		this.btn.style.cursor = 'pointer';
		this.btn.style.display = 'flex';
		this.btn.style.justifyContent = 'space-between';
		this.btn.style.alignItems = 'center';
		this.btn.style.fontSize = 'medium';
		this.btn.style.boxSizing = 'border-box'; 
		this.btn.style.padding = "4px";

		this.label = document.createElement('span');
		this.label.style.paddingLeft = "2px";
		this.label.style.flexGrow = "1"; 
		this.label.style.pointerEvents = "none"; 
		this.label.style.whiteSpace = "nowrap";
		this.label.style.overflow = "hidden";
		this.label.style.textOverflow = "ellipsis"; 
		this.label.style.minWidth = "0"; 				
		this.label.textContent = this.placeholder;
		this.btn.appendChild(this.label);

		const actionsContainer = document.createElement('div');
		actionsContainer.style.display = 'flex';
		actionsContainer.style.alignItems = 'center';
		actionsContainer.style.gap = '8px';
		actionsContainer.style.flexShrink = '0'; // Impede o botão X e a seta de esmagarem o texto

		this.clearBtn = document.createElement('span');
		this.clearBtn.textContent = '\u2715'; 
		this.clearBtn.style.cursor = 'pointer';
		this.clearBtn.style.color = '#999';
		this.clearBtn.style.fontSize = '14px';
		this.clearBtn.style.display = 'none'; 
		this.clearBtn.style.padding = '4px';

		this.clearBtn.addEventListener('mouseenter', () => this.clearBtn.style.color = '#333');
		this.clearBtn.addEventListener('mouseleave', () => this.clearBtn.style.color = '#999');
		actionsContainer.appendChild(this.clearBtn);

		const arrow = document.createElement('span');
		arrow.textContent = '\u25BC';
		actionsContainer.appendChild(arrow);

		this.btn.appendChild(actionsContainer);
		this.wrapper.appendChild(this.btn);

		this.dropdown = document.createElement('div');
		this.dropdown.style.position = 'absolute';
		this.dropdown.style.left = '0';
		this.dropdown.style.width = '100%';
		this.dropdown.style.border = '1px solid #ccc';
		this.dropdown.style.background = '#fff';
		this.dropdown.style.zIndex = '1000';
		this.dropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
		this.dropdown.style.borderRadius = '4px';
		this.dropdown.style.boxSizing = 'border-box';
		this.dropdown.style.padding = '10px';
		this.dropdown.style.display = 'none';

		this.input = document.createElement('input');
		this.input.type = 'text';
		this.input.placeholder = 'Digite para filtrar...';
		this.input.style.fontSize = "medium";
		this.input.style.width = '100%';
		this.input.style.padding = '10px';
		this.input.style.boxSizing = 'border-box';
		this.input.style.border = '1px solid #ddd';
		this.input.style.borderRadius = '4px';
		this.dropdown.appendChild(this.input);

		this.list = document.createElement('ul');
		this.list.style.listStyle = 'none';
		this.list.style.padding = '0';
		this.list.style.margin = '0';
		this.list.style.overflowY = 'auto';
		this.list.style.webkitOverflowScrolling = 'touch';
		this.list.style.maxHeight = "400px";
		this.renderOptions();

		this.dropdown.appendChild(this.list);
		this.wrapper.appendChild(this.dropdown);
		this.elemento.appendChild(this.wrapper);

		this.wrapper.addEventListener('focusout', (e) => {
			if (!this.wrapper.contains(e.relatedTarget)) {
				this.closeDropdown();
			}
		});
	}
	renderOptions() {
		if (!this.options) {
			return;
		}
		this.list.textContent = '';
		this.items = [];
		this.focusedItemIndex = -1; // Reseta índice do teclado

		this.options.forEach(opt => {
			const item = document.createElement('li');
			if (opt.value !== undefined) {
				item.setAttribute('data-value', opt.value);
			} else {
				item.setAttribute('data-value', opt.text);
			}
			item.textContent = opt.text;
			item.style.padding = '6px 4px';
			item.style.cursor = 'pointer';
			item.style.borderRadius = '4px';
			item.style.transition = 'background 0.2s, color 0.2s';
			
			item.addEventListener('mouseenter', () => {
				this.clearItemFocus(); // Remove destaque das setas se mover o mouse
				item.style.backgroundColor = '#f0f0f0';
			});
			item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
			item.addEventListener('touchstart', () => item.style.backgroundColor = '#f0f0f0');
			item.addEventListener('touchend', () => item.style.backgroundColor = 'transparent');
			item.addEventListener('mousedown', (e) => {
				e.stopPropagation();
				e.preventDefault(); 
				this.selectItem(item);
			});
			
			this.list.appendChild(item);
			this.items.push(item);
		});
	}
	clearItemFocus() {
		this.items.forEach(item => {
			item.style.backgroundColor = 'transparent';
			item.style.color = '#000';
		});
	}
	updateItemFocus() {
		this.clearItemFocus();
		const visibleItems = this.items.filter(item => item.style.display !== 'none');
		if (visibleItems.length === 0) return;

		if (this.focusedItemIndex >= visibleItems.length) this.focusedItemIndex = 0;
		if (this.focusedItemIndex < 0) this.focusedItemIndex = visibleItems.length - 1;

		const activeItem = visibleItems[this.focusedItemIndex];
		activeItem.style.backgroundColor = '#007bff'; // Destaque azul clássico
		activeItem.style.color = '#fff';
		// Controla a barra de rolagem da lista de forma automática
		const listRect = this.list.getBoundingClientRect();
		const itemRect = activeItem.getBoundingClientRect();

		if (itemRect.bottom > listRect.bottom) {
			this.list.scrollTop += (itemRect.bottom - listRect.bottom);
		} else if (itemRect.top < listRect.top) {
			this.list.scrollTop -= (listRect.top - itemRect.top);
		}
	}
	setOptions(newOptions = []) {
		const valorAnterior = this.selectedValue;
		this.options = newOptions;
		this.renderOptions();
		const aindaExiste = this.options?.some(opt => {
			const optValue = opt.value !== undefined ? opt.value : opt.text;
			return String(optValue) === String(valorAnterior);
		});
		if (aindaExiste && valorAnterior !== null) {
			this.setValue(valorAnterior);
		} else {
			this.clearSelection();
		}
	}
	clearSelection() {
		this.selectedValue = null;
		this.label.textContent = this.placeholder;
		this.clearBtn.style.display = 'none'; 

		const event = new CustomEvent('change', { 
			detail: { value: null, text: '' } 
		});
		this.elemento.dispatchEvent(event);
	}
	setupEvents() {
		this.btn.addEventListener('click', (e) => {
			e.stopPropagation();
			e.preventDefault(); 
			const isClosed = this.dropdown.style.display === 'none';
			if (isClosed) {
				window.dispatchEvent(new CustomEvent('cs-close-all'));
				this.adjustDropdownPosition();
				this.dropdown.style.display = 'block';
				this.input.value = '';
				this.filterOptions('');
				setTimeout(() => this.input.focus(), 50); 
			} else {
				this.closeDropdown();
			}
		});
		window.addEventListener('cs-close-all', () => {
			this.closeDropdown();
		});
		this.clearBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			e.preventDefault();
			this.clearSelection();
		});
		this.input.addEventListener('input', (e) => {
			this.filterOptions(e.target.value);
		});
		document.addEventListener('mousedown', (e) => {
			if (!this.wrapper.contains(e.target)) {
				this.closeDropdown();
			}
		});
		this.btn.addEventListener('keydown', (e) => {
			const isClosed = this.dropdown.style.display === 'none';
			if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault(); 
				if (isClosed) {
					window.dispatchEvent(new CustomEvent('cs-close-all'));
					this.adjustDropdownPosition();
					this.dropdown.style.display = 'block';
					this.input.value = '';
					this.filterOptions('');
					setTimeout(() => this.input.focus(), 50); 
				}
			}
		});
		this.input.addEventListener('keydown', (e) => {
			const isClosed = this.dropdown.style.display === 'none';
			if (isClosed) return;

			const visibleItems = this.items.filter(item => item.style.display !== 'none');

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				this.focusedItemIndex++;
				this.updateItemFocus();
			} 
			else if (e.key === 'ArrowUp') {
				e.preventDefault();
				this.focusedItemIndex--;
				this.updateItemFocus();
			} 
			else if (e.key === 'Enter') {
				e.preventDefault();
				if (this.focusedItemIndex >= 0 && this.focusedItemIndex < visibleItems.length) {
					this.selectItem(visibleItems[this.focusedItemIndex]);
				}
			} 
			else if (e.key === 'Escape') {
				this.closeDropdown();
				this.btn.focus();
			}
		});
		this.btn.addEventListener('keydown', (e) => {
			const isClosed = this.dropdown.style.display === 'none';
			if (e.key === 'Delete' || e.key === 'Backspace') {
				if (isClosed) {
					e.preventDefault();
					this.clearSelection(); // Chama o seu método de limpar já existente
				}
			}
			else if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault(); 
				if (isClosed) {
					window.dispatchEvent(new CustomEvent('cs-close-all'));
					this.adjustDropdownPosition();
					this.dropdown.style.display = 'block';
					this.input.value = '';
					this.filterOptions('');
					setTimeout(() => this.input.focus(), 50); 
				}
			}
		});

	}
	adjustDropdownPosition() {
		const rect = this.btn.getBoundingClientRect();
		const espacoAbaixo = window.innerHeight - rect.bottom;
		const alturaEstimadaDropdown = 240;

		this.dropdown.style.top = '';
		this.dropdown.style.bottom = '';
		this.dropdown.style.marginTop = '';
		this.dropdown.style.marginBottom = '';

		if (espacoAbaixo < alturaEstimadaDropdown && rect.top > espacoAbaixo) {
			this.dropdown.style.bottom = '100%';
			this.dropdown.style.marginBottom = '4px';
		} else {
			this.dropdown.style.top = '100%';
			this.dropdown.style.marginTop = '4px';
		}
	}
	filterOptions(searchTerm) {
		const term = searchTerm.toLowerCase();
		this.items.forEach(item => {
			const text = item.textContent.toLowerCase();
			if (text.includes(term)) {
				item.style.display = 'block';
			} else {
				item.style.display = 'none';
			}
		});
		this.focusedItemIndex = -1; // Reseta seleção do teclado ao filtrar
		this.clearItemFocus();
	}
	selectItem(item) {
		this.selectedValue = item.getAttribute('data-value');
		this.label.textContent = item.textContent;
		this.clearBtn.style.display = 'block';
		this.closeDropdown();
		const event = new CustomEvent('change', {
			detail: { value: this.selectedValue, text: item.textContent }
		});
		this.elemento.dispatchEvent(event);
		}
	closeDropdown() {
		this.dropdown.style.display = 'none';
		this.focusedItemIndex = -1; // Limpa foco ao fechar
	}
	getValue() {
		return this.selectedValue;
	}
	setValue(value) {
		if (value === null || value === undefined || value === '') {
			this.clearSelection();
			return;
		}
		const opcaoEncontrada = this.options?.find(opt => {
			const optValue = opt.value !== undefined ? opt.value : opt.text;
			return String(optValue) === String(value);
		});
		if (opcaoEncontrada) {
			this.selectedValue = opcaoEncontrada.value !== undefined ? opcaoEncontrada.value : opcaoEncontrada.text;
			this.label.textContent = opcaoEncontrada.text;
			this.clearBtn.style.display = 'block'; // Mostra o botão X de limpar
			const event = new CustomEvent('change', { 
				detail: { value: this.selectedValue, text: opcaoEncontrada.text } 
			});
			this.elemento.dispatchEvent(event);
		} else {
			console.warn(`A opção com o valor "${value}" não foi encontrada no CustomSelect.`);
		}
	}
}

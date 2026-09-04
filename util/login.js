import { Util } from './util.js?v5';

document.getElementById('formLogin').addEventListener('submit', function(e) {
	e.preventDefault();
	const erroDiv = document.getElementById('mensagemErro');
	const btn = e.target.querySelector('button');
	// Resetar estado visual
	erroDiv.style.display = 'none';
	btn.innerText = 'Carregando...';
	btn.disabled = true;
	const dados = {
		usuario: document.getElementById('usuario').value,
		senha:  document.getElementById('senha').value
	};
	let util = new Util();
	util.autenticacao(dados)
		.then(data => {
			if (data.sucesso) {
				const params = new URLSearchParams(window.location.search);
				const paginaAnterior = params.get('origem') || "index.html";
				//console.log("paginaAnterior", paginaAnterior);
				window.location.href = paginaAnterior;
			} else {
				// Exibe a mensagem vinda do Java
				erroDiv.innerText = data.mensagem || "Erro na autenticação.";
				erroDiv.style.display = 'block';
				btn.innerText = 'Entrar';
				btn.disabled = false;
			}
		})
		.catch(error => {
			erroDiv.innerText = "Erro de conexão com o servidor.";
			erroDiv.style.display = 'block';
			btn.innerText = 'Entrar';
			btn.disabled = false;
		});
});
document.getElementById('usuario').focus()
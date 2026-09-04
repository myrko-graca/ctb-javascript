String.prototype.extenso = function(c){
	var ex = [
		["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"],
		["dez", "vinte", "trinta", "quarenta", "cinqüenta", "sessenta", "setenta", "oitenta", "noventa"],
		["cem", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"],
		["mil", "milhão", "bilhão", "trilhão", "quadrilhão", "quintilhão", "sextilhão", "setilhão", "octilhão", "nonilhão", "decilhão", "undecilhão", "dodecilhão", "tredecilhão", "quatrodecilhão", "quindecilhão", "sedecilhão", "septendecilhão", "octencilhão", "nonencilhão"]
	];
	var a, n, v, i, n = this.replace(c ? /[^,\d]/g : /\D/g, "").split(","), e = " e ", $ = "real", d = "centavo", sl;
	for(var f = n.length - 1, l, j = -1, r = [], s = [], t = ""; ++j <= f; s = []){
		j && (n[j] = (("." + n[j]) * 1).toFixed(2).slice(2));
		if(!(a = (v = n[j]).slice((l = v.length) % 3).match(/\d{3}/g), v = l % 3 ? [v.slice(0, l % 3)] : [], v = a ? v.concat(a) : v).length) continue;
		for(a = -1, l = v.length; ++a < l; t = ""){
			if(!(i = v[a] * 1)) continue;
			i % 100 < 20 && (t += ex[0][i % 100]) ||
			i % 100 + 1 && (t += ex[1][(i % 100 / 10 >> 0) - 1] + (i % 10 ? e + ex[0][i % 10] : ""));
			s.push((i < 100 ? t : !(i % 100) ? ex[2][i == 100 ? 0 : i / 100 >> 0] : (ex[2][i / 100 >> 0] + e + t)) +
			((t = l - a - 2) > -1 ? " " + (i > 1 && t > 0 ? ex[3][t].replace("ão", "ões") : ex[3][t]) : ""));
		}
		a = ((sl = s.length) > 1 ? (a = s.pop(), s.join(" ") + e + a) : s.join("") || ((!j && (n[j + 1] * 1 > 0) || r.length) ? "" : ex[0][0]));
		a && r.push(a + (c ? (" " + (v.join("") * 1 > 1 ? j ? d + "s" : (/0{6,}$/.test(n[0]) ? "de " : "") + $.replace("l", "is") : j ? d : $)) : ""));
	}
	return r.join(e);
}

function extensoIngles(s){
	var units=new Array("one","two","three","four","five","six","seven","eight","nine");
	var teens=new  Array("ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen ","nineteen");
	var tens=new Array("twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety");
	var illions=new Array('m','b','tr','quadr','quint','sext','sept','oct','non','dec','undec','duodec','tredec','quattuordec','quindec','sexdec','septendec','octodec','novemdec','vigint','unvigint','duovigint','trevigint','quattuorvigint','quinvigint','sexvigint','septenvigint','octovigint','novemvigint','trigint','untrigint','duotrigint','tretrigint','quattuortrigint','quintrigint','sextrigint','septentrigint','octotrigint','novemtrigint','quadragint','unquadragint','duoquadragint','trequadragint','quattuorquadragint','quinquadragint','sexquadragint','septenquadragint','octoquadragint','novemquadragint','quinquagint','unquinquagint','duoquinquagint','trequinquagint','quattuorquinquagint','quinquinquagint','sexquinquagint','septenquinquagint','octoquinquagint','novemquinquagint','sexagint','unsexagint','duosexagint','tresexagint','quattuorsexagint','quinsexagint','sexsexagint','septsexagint','octosexagint','novemsexagint','septuagint','unseptuagint','duoseptuagint','treseptuagint','quattuorseptuagint','quinseptuagint','sexseptuagint','septseptuagint','octoseptuagint','novemseptuagint','octogint','unoctogint','duooctogint','treoctogint','quattuoroctogint','quinoctogint','sexoctogint','septoctogint','octooctogint','novemoctogint','nonagint','unnonagint','duononagint','trenonagint','duattuornonagint','quinnonagint','sexnonagint','septnonagint','octononagint','novemnonagint','cent','cenunt','duocent','centret');

	function smallNum(num, mag){
		var a=num.charAt(0);
		var b=num.charAt(1);
		var c=num.charAt(2);
		var s="";
		if (a!=0) {
			s+=units[a-1] + " hundred";
			if (b==0 && c==0) return s;
			else s+=" and ";
		}
		if (b==0) {
			if (c==0) return "";
			return s+units[c-1];
		}
		if (b==1) {
			return s+teens[c];
		}
		if (b>1) {
			s+=tens[b-2];
			if (c>0) s+="-" + units[c-1];
			return s;
		}
	}

	if (s.length>315) {
		return("Your number is "+s.length+" digits long.\nThe maximum length is 303  digits.");
	}
	var r="", temp="";
	while(s.length%3>0) s="0"+s;
	var max=Math.ceil(s.length/3);
	for (var i=0; i<max; i++) {
		temp=smallNum(s.substr(i*3, 3));
		if (temp!="") {
			if (max-i==1 && r!="" && s.substr(i*3, 3)<100) r+=" and ";
			else if (r!="") r+=", ";
			if (max-i==2) temp+=" thousand";
			if (max-i>2) temp+=" "+illions[max-i-3]+"illion";
		}
		r+=temp;
	}
	if (s==0) r="zero";

	return r;
}
function extensoEspanhol(n) { 
	function letras(c,d,u,n1) {
		var centenas,decenas,decom
		var lc=""
		var ld=""
		var lu=""
		centenas=eval(c);
		decenas=eval(d);
		decom=eval(u);
		switch(centenas) {
			case 0: lc="";break;
			case 1: {
				if (decenas==0 && decom==0)
					lc="Cien"
				else
					lc="Ciento ";
			}
			break;
			case 2: lc="doscientos ";break;
			case 3: lc="trescientos ";break;
			case 4: lc="cuatrocientos ";break;
			case 5: lc="quinientos ";break;
			case 6: lc="seiscientos ";break;
			case 7: lc="setecientos ";break;
			case 8: lc="ochocientos ";break;
			case 9: lc="novecientos ";break; 
		}
		
		switch(decenas) {
			case 0: ld="";break;
			case 1: { 
				switch(decom) {
					case 0:ld="diez";break;
					case 1:ld="once";break;
					case 2:ld="doce";break;
					case 3:ld="trece";break;
					case 4:ld="catorce";break;
					case 5:ld="quince";break;
					case 6:ld="dieciséis";break;
					case 7:ld="diecisiete";break;
					case 8:ld="dieciocho";break;
					case 9:ld="diecinueve";break;
				}
			}
			break;
			case 2:ld="veinte";break;
			case 3:ld="treinta";break;
			case 4:ld="cuarenta";break;
			case 5:ld="cincuenta";break;
			case 6:ld="sesenta";break;
			case 7:ld="setenta";break;
			case 8:ld="ochenta";break;
			case 9:ld="noventa";break; 
		}
		switch(decom) {
			case 0: lu="";break;
			case 1: lu="uno";break;
			case 2: lu="dos";break;
			case 3: lu="tres";break;
			case 4: lu="cuatro";break;
			case 5: lu="cinco";break;
			case 6: lu="seis";break;
			case 7: lu="siete";break;
			case 8: lu="ocho";break;
			case 9: lu="nueve";break; 
		}
		 
		if (decenas==1) {
			return (lc+ld).trim();
		}
		if (decenas==0 || decom==0) {
			return (lc+" "+ld+lu).trim();
		} else {
			if(decenas==2) {
				ld="veinti";
				if (decom == 1){
					if (n1 == 0)
						lu = "uno";
					else if (n1 == 1)
						lu = "ún";
				}
				if (decom == 2){
					lu = "dós";
				} else if (decom == 3){
					lu = "trés";	
				} else if (decom == 6){
					lu = "séis";	
				}
				return (lc + ld + lu.toLowerCase()).trim();
			} else {
				return (lc+ld+" y "+lu).trim()
			}
		}
	}
	
	var m0,cm,dm,um,cmi,dmi,umi,ce,de,un,hlp,decimal;
	 
	if (isNaN(n)) {
		return("O dado inserido deve ser numérico");
	}
	m0= Math.floor(n/ 1000000000000); rm0=n% 1000000000000;
	m1= Math.floor(rm0/100000000000); rm1=rm0%100000000000;
	m2= Math.floor(rm1/10000000000); rm2=rm1%10000000000;
	m3= Math.floor(rm2/1000000000); rm3=rm2%1000000000;
	cm= Math.floor(rm3/100000000); r1= rm3%100000000;
	dm= Math.floor(r1/10000000); r2= r1% 10000000;
	um= Math.floor(r2/1000000); r3= r2% 1000000;
	cmi=Math.floor(r3/100000); r4= r3% 100000;
	dmi=Math.floor(r4/10000); r5= r4% 10000;
	umi=Math.floor(r5/1000); r6= r5% 1000;
	ce= Math.floor(r6/100); r7= r6% 100;
	de= Math.floor(r7/10); r8= r7% 10;
	un= Math.floor(r8/1);

	if (n<1000000000 && n>=1000000) {
		mldata=letras(cm,dm,um,1); 
		hlp=mldata.replace("Un","*");
		if (hlp.indexOf("*")<0 || hlp.indexOf("*")>3) {
			mldata=mldata.replace("uno","un");
			mldata+=" millones ";
		} else {
			mldata="un millón ";
		}
		mdata=letras(cmi,dmi,umi,1);

		cdata=letras(ce,de,un,0);
		if(mdata!=' ') {
			mdata+=" mil ";
			if (n == 1000000) {
				mdata=mdata.replace("uno","un");
			} else {
				mdata=mdata.replace("uno","un");
			}
		}

		return (mldata+mdata+cdata).trim();
	} 
	if (n<1000000 && n>=1000) {
		mdata=letras(cmi,dmi,umi,1);
		cdata=letras(ce,de,un,0);
		hlp=mdata.replace("un","*");
		if (hlp.indexOf("*")<0 || hlp.indexOf("*")>3) {
			mdata=mdata.replace("uno","un");
			return (mdata+" mil "+cdata).trim();
		} else {
			return ("mil "+ cdata).trim();
		}
	}
	if (n<1000 && n>=1)	{
		return (letras(ce,de,un,0)).trim();
	}
	if (n==0) {
		return "cero";
	}
	return "Número não disponível"
}

function extensoOrdinal( n ){
	//Obs: Imprime por extenso até 9.999, após isso imprime o número (ex: 10.000 -> "10000º").
	function add(n,i){
		var s="";
		if(n%10){
			s = v[i][n%10];
		}
		return s;
	}
	const v=[
		["","Primeiro","Segundo","Terceiro","Quarto","Quinto","Sexto","Sétimo","Oitavo","Nono"],
		["","Décimo","Vigésimo","Trigésimo","Quadragésimo","Quinquagésimo","Sexagésimo","Septuagésimo","Octogésimo","Nonagésimo "],
		["","Centésimo","Ducentésimo","Tricentésimo","Quadringentésimo","Quingentésimo","Seiscentésimo","Septingentésimo","Octingentésimo ","Noningentésimo "],
		["","Milésimo"]
	];
	if(n>1999){
		for(var i=2;i<10;i++){
			v[3][i]=extensoOrdinal( i )+" milésimo";
		}
	}
	var i=0;
	var s="";
	var q=n;
	var c;
	while( q >=1 && i < v.length){
		c = add(q,i++);
		if( c == null ){
			break;
		}
		s=c + " "+s.toLowerCase();
		q=parseInt(q/10);
	}
	return c ? s.trim() : n+'º';
}


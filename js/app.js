const formulario = document.getElementById('formulario');

formulario.addEventListener('submit', async(e) => {
    e.preventDefault();


    const respuesta = await fetch('https://sheet.best/api/sheets/9b7a3d95-91f9-45f2-969f-a0a8e73d8df4',{
        method:'POST',
        mode:'cors',
        headers:{
            'Content-Type':'application/json'
        },
        body: JSON.stringify({
            "FECHA":formulario.fecha.value,
            "NOMBRE":formulario.nombre.value,
            "NO. DE BOLETA": formulario.boleta.value,
            "MATERIA":formulario.materia.value,
            "PROFESOR":formulario.profesor.value,
            "CANTIDAD DE PIEZAS":formulario.piezas.value,
            "HRS DE USO":formulario.piezas.value,
            "CANTIDAD DE MATERIAL":formulario.material.value
        })
    });

    registro.classList.remove('activo');
    exito.classList.add('activo');

    console.log(respuesta);
});



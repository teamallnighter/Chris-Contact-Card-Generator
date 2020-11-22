<svelte:head>
	<title>Chris' Contact Card App</title>
</svelte:head>
<script>
	import ContactCard from './ContactCard.svelte'
	let name = '';
	let url = '';
	let jobTitle = '';
	let description = '';
function nameInput(event) {
	const enteredValue = event.target.value;
	name = enteredValue;
}

</script>
<style>
	h1{
		color: #1b1b1b;
		margin-top:10vh;
	}
	
	input{
		box-shadow: 2px 4px 8px grey;
		width:50vw;
		border: #1b1b1b 2px inset;
	}
	
	.container{
		display:flex;
		flex-direction: column;
		justfify-content:center;
		align-content: center;
		align-items: center;
		justify-items:center;
	}
	
	textarea{
		box-shadow: 2px 4px 8px grey;
		width:50vw;
		border: #1b1b1b 2px inset;
	}
	
	.imma-hr{
		margin-top:20vh;
	}
</style>
<div class="container">
	<h1>Hello {name}!</h1>
	<input type="text" bind:value="{name}" placeholder="Enter Your Name"/>
	<br/>
	<input type="text" bind:value="{url}" placeholder="Enter Image URL"/>
	<br/>
	<input type="text" bind:value="{jobTitle}" placeholder="Enter A Job Title"/>
	<br/>
	<textarea id="description" name="description" rows="5" bind:value="{description}" placeholder="Enter A Job Description"/>
</div>
<br>
<hr class="imma-hr">
<ContactCard userName="{name}" image="{url}" {jobTitle} {description}/>
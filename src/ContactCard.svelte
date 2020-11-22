<script>
	export let userName;
	export let image;
	export let jobTitle;
	export let description;
</script>
<style>
	h1{
		color:#1b1b1b
	}
	.contact-card-wrapper{
		padding: 100px;
	}
	
	.contact-card{
		display:flex;
		flex-direction: column;
		justfify-content:center;
		align-content: center;
		align-items: center;
		justify-items:center;
		
		padding: 40px;
		border: 3px inset #1b1b1b;
		box-shadow: 3px 6px 12px grey;
	}
	
	h1{
		text-align: center;
	}
	h2{
		text-align:center;
	}
	p{
		padding:10px;
		text-align:center;
	}
	
	.no-thumb{
		display:none;
	}
	
</style>
<div class="contact-card-wrapper">
	<header class="{userName ? 'contact-card' : 'hidden'}">
		<div class="{image ? 'thumb' : 'no-thumb'}">
			<img src="{image}" alt="{userName}'s Image'" height="200"/>
			<hr>
		</div>
		<div>
			<h1 class="{userName ? 'userName' : 'hidden'}">{userName}</h1>
			<h2 class="{jobTitle ? 'jobTitle' : 'hidden'}">{jobTitle}</h2>
		</div>
		<div class="{description ? 'description' : 'hidden'}">
			<p>{description}</p>
		</div>
	</header>
	
</div>